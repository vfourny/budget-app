import type { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { splitCsvLine } from "@server/lib/csv/parse-bank-statement";
import type { ParsedBankStatement } from "@server/lib/csv/types";
import { env } from "@server/lib/env";
import { csvFormatConfigSchema, type CsvFormatConfig } from "@shared/csv-format";

/** En-tête + 8 opérations : de quoi repérer les colonnes sans envoyer tout le relevé à l'IA. */
const SAMPLE_LINES = 9;
const MAX_FIELD_LENGTH = 60;
const DELIMITERS = [";", ",", "\t"] as const satisfies readonly CsvFormatConfig["delimiter"][];

/** Les lignes non vides du fichier, sans BOM UTF-8. */
function csvLines(csvText: string): string[] {
  return csvText
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
}

/** Le délimiteur est déterministe : le séparateur le plus fréquent de la 1re ligne. */
function guessDelimiter(firstLine: string): CsvFormatConfig["delimiter"] {
  let best: CsvFormatConfig["delimiter"] = ";";
  let bestCount = 0;
  for (const delimiter of DELIMITERS) {
    const count = firstLine.split(delimiter).length - 1;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

/** Réponse de l'IA. Colonnes désignées par index ; `-1` = colonne de montant non utilisée. */
const detectionSchema = z.object({
  bankName: z.string(),
  hasHeader: z.boolean(),
  dateFormat: z.enum(["yyyy-mm-dd", "dd/mm/yyyy"]),
  decimalSeparator: z.enum([",", "."]),
  dateColumn: z.number().int(),
  labelColumns: z.array(z.number().int()),
  amountKind: z.enum(["signed", "debitCredit"]),
  amountColumn: z.number().int(),
  debitColumn: z.number().int(),
  creditColumn: z.number().int(),
});

/** Schéma JSON imposé à la réponse (sortie structurée Gemini). */
const outputSchema = {
  type: "object",
  properties: {
    bankName: { type: "string" },
    hasHeader: { type: "boolean" },
    dateFormat: { type: "string", enum: ["yyyy-mm-dd", "dd/mm/yyyy"] },
    decimalSeparator: { type: "string", enum: [",", "."] },
    dateColumn: { type: "integer" },
    labelColumns: { type: "array", items: { type: "integer" } },
    amountKind: { type: "string", enum: ["signed", "debitCredit"] },
    amountColumn: { type: "integer" },
    debitColumn: { type: "integer" },
    creditColumn: { type: "integer" },
  },
  required: [
    "bankName",
    "hasHeader",
    "dateFormat",
    "decimalSeparator",
    "dateColumn",
    "labelColumns",
    "amountKind",
    "amountColumn",
    "debitColumn",
    "creditColumn",
  ],
};

const systemPrompt = `Tu analyses l'export CSV d'un compte bancaire français pour trouver quelles colonnes contiennent la date, le libellé et le montant des opérations.

On te donne les premières lignes du fichier, déjà découpées : chaque ligne est écrite « [0] valeur | [1] valeur | … » où [n] est l'index de la colonne (à partir de 0). Les index sont la seule référence : certains exports ont plusieurs colonnes au même nom.

Règles :
- hasHeader : true si la 1re ligne est une ligne de titres de colonnes, false si c'est déjà une opération.
- dateColumn : la date de l'opération (« date opération », « date comptable »), pas la date de valeur.
- labelColumns : 1 à 3 colonnes qui décrivent l'opération (libellé brut, informations complémentaires, référence…), de la plus importante à la moins importante. Jamais une catégorie, un numéro de compte ou un solde.
- Montant : soit une seule colonne signée (amountKind = "signed" et amountColumn), soit deux colonnes débit et crédit (amountKind = "debitCredit", debitColumn et creditColumn). Mets -1 dans les colonnes de montant qui ne servent pas.
- Ne choisis JAMAIS une colonne de solde : le solde courant est un grand nombre qui évolue d'une ligne à l'autre (il vaut le solde de la ligne précédente plus le montant). Si deux colonnes portent le même nom, le montant de l'opération est celle qui ne cumule pas.
- decimalSeparator : le séparateur décimal des montants. dateFormat : le format des dates.
- bankName : le nom de la banque si tu peux le déduire du fichier, sinon une chaîne vide.`;

function formatSample(lines: readonly string[], delimiter: CsvFormatConfig["delimiter"]): string {
  return lines
    .map((line, row) => {
      const fields = splitCsvLine(line, delimiter).map(
        (field, column) => `[${column}] ${field.trim().slice(0, MAX_FIELD_LENGTH)}`,
      );
      return `Ligne ${row + 1} : ${fields.join(" | ")}`;
    })
    .join("\n");
}

export interface DetectedCsvFormat {
  bankName: string;
  config: CsvFormatConfig;
  /** Cellules de la 1re ligne (titres si `config.hasHeader`), pour nommer les colonnes à l'écran. */
  columns: string[];
}

/**
 * Détecte le mapping de colonnes d'un export CSV inconnu. L'IA ne reçoit que l'en-tête et quelques
 * lignes, et ne fait que désigner des colonnes : le parsing des montants reste du code
 * déterministe. Lève une erreur si la réponse est inutilisable (colonne hors du fichier…).
 */
export async function detectCsvFormat(
  client: GoogleGenAI,
  csvText: string,
): Promise<DetectedCsvFormat> {
  const lines = csvLines(csvText);
  if (lines.length === 0) throw new Error("Fichier vide.");

  const delimiter = guessDelimiter(lines[0]);
  const columns = splitCsvLine(lines[0], delimiter).map((field) => field.trim());

  const response = await client.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: formatSample(lines.slice(0, SAMPLE_LINES), delimiter),
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseJsonSchema: outputSchema,
      temperature: 0,
    },
  });

  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason !== undefined && finishReason !== "STOP") {
    throw new Error(`Réponse de l'IA inutilisable (finishReason : ${finishReason}).`);
  }
  if (!response.text) throw new Error("Réponse de l'IA vide.");

  const detected = detectionSchema.parse(JSON.parse(response.text));
  const config = csvFormatConfigSchema.parse({
    delimiter,
    hasHeader: detected.hasHeader,
    dateFormat: detected.dateFormat,
    decimalSeparator: detected.decimalSeparator,
    dateColumn: detected.dateColumn,
    labelColumns: [...new Set(detected.labelColumns)],
    amount:
      detected.amountKind === "signed"
        ? { kind: "signed", column: detected.amountColumn }
        : { kind: "debitCredit", debit: detected.debitColumn, credit: detected.creditColumn },
  });

  const used = [
    config.dateColumn,
    ...config.labelColumns,
    ...(config.amount.kind === "signed"
      ? [config.amount.column]
      : [config.amount.debit, config.amount.credit]),
  ];
  if (used.some((column) => column >= columns.length)) {
    throw new Error("L'IA désigne une colonne qui n'existe pas dans le fichier.");
  }

  return { bankName: detected.bankName.trim().slice(0, 60), config, columns };
}

/** Anomalies repérées sur le relevé parsé avec le format détecté : un **code**, traduit côté front
 * (`fr.importForm.formatChecks`). `NO_TRANSACTIONS` empêche de confirmer le format. */
export type DetectionCheckCode =
  "NO_TRANSACTIONS" | "UNREADABLE_LINES" | "DATES_OUT_OF_RANGE" | "EMPTY_LABELS";

const MIN_PLAUSIBLE_DATE = Date.UTC(2000, 0, 1);
const ONE_MONTH_MS = 31 * 24 * 60 * 60 * 1000;

/** Contrôles de cohérence : un mapping faux (mauvaise colonne de date, de libellé…) se voit
 * presque toujours ici, avant que quoi que ce soit soit écrit en base. */
export function checkParsedStatement(
  parsed: ParsedBankStatement,
  now: Date = new Date(),
): DetectionCheckCode[] {
  const checks: DetectionCheckCode[] = [];
  if (parsed.transactions.length === 0) checks.push("NO_TRANSACTIONS");
  if (parsed.errors.length > 0) checks.push("UNREADABLE_LINES");

  const latest = now.getTime() + ONE_MONTH_MS;
  const outOfRange = parsed.transactions.some(
    (transaction) =>
      transaction.date.getTime() < MIN_PLAUSIBLE_DATE || transaction.date.getTime() > latest,
  );
  if (outOfRange) checks.push("DATES_OUT_OF_RANGE");
  if (parsed.transactions.some((transaction) => transaction.label === "")) {
    checks.push("EMPTY_LABELS");
  }
  return checks;
}

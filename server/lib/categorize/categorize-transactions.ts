import type { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { TransactionCategory } from "@server/generated/prisma/enums";
import { CATEGORY_HINTS } from "@server/lib/categorize/category-hints";
import { env } from "@server/lib/env";

/** Nombre de lignes envoyées par appel : peu d'appels par import (quota de requêtes par minute du
 * palier gratuit Gemini), les appels d'un même import partent en parallèle. */
const CHUNK_SIZE = 200;

/** En dessous de cette confiance, la ligne sera proposée dans « À vérifier » à la relecture. */
export const LOW_CONFIDENCE_THRESHOLD = 0.7;

const CATEGORIES = Object.values(TransactionCategory);

export interface CategorizeInput {
  label: string;
  /** Centimes, signé : négatif = débit. */
  amountCents: number;
}

/** Transaction déjà validée, montrée à l'IA comme exemple (few-shot). */
export interface CategorizeExample extends CategorizeInput {
  category: TransactionCategory;
}

export interface CategorizedLine {
  category: TransactionCategory;
  /** Entre 0 et 1. */
  confidence: number;
}

const responseSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int(),
      category: z.enum(TransactionCategory),
      confidence: z.number(),
    }),
  ),
});

/** Schéma JSON imposé à la réponse (sortie structurée Gemini). `enum` garantit une catégorie valide. */
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          category: { type: "string", enum: CATEGORIES },
          confidence: { type: "number" },
        },
        required: ["index", "category", "confidence"],
      },
    },
  },
  required: ["results"],
} as const;

const SYSTEM_PROMPT = `Tu classes les lignes d'un relevé bancaire français dans une liste figée de catégories de budget.

Catégories (code : description) :
${CATEGORIES.map((category) => `- ${category} : ${CATEGORY_HINTS[category]}`).join("\n")}

Règles :
- Chaque ligne est au format « index | montant en euros | libellé bancaire ». Un montant négatif est un débit, un montant positif est un crédit.
- Réponds pour TOUTES les lignes, en reprenant leur index.
- confidence est un nombre entre 0 et 1 : proche de 1 si le libellé identifie clairement le commerçant ou la nature de la dépense, autour de 0.5 si tu hésites entre plusieurs catégories, inférieur à 0.3 si tu devines.
- Si des exemples de transactions déjà validées sont fournis, privilégie leur logique pour les libellés similaires.`;

/** 123456 → "1234,56", -5 → "-0,05". Uniquement pour l'affichage dans le prompt : les montants
 * restent des entiers en centimes, aucun float. */
function formatCents(amountCents: number): string {
  const absolute = Math.abs(amountCents);
  const euros = Math.trunc(absolute / 100);
  const cents = String(absolute % 100).padStart(2, "0");
  return `${amountCents < 0 ? "-" : ""}${euros},${cents}`;
}

function formatExamples(examples: readonly CategorizeExample[]): string {
  if (examples.length === 0) return "";
  const lines = examples.map(
    (example) => `${formatCents(example.amountCents)} | ${example.label} → ${example.category}`,
  );
  return `Exemples de transactions déjà validées (montant | libellé → catégorie) :\n${lines.join("\n")}\n\n`;
}

async function categorizeChunk(
  client: GoogleGenAI,
  chunk: readonly CategorizeInput[],
  examples: readonly CategorizeExample[],
): Promise<(CategorizedLine | null)[]> {
  const lines = chunk.map(
    (transaction, index) =>
      `${index} | ${formatCents(transaction.amountCents)} | ${transaction.label}`,
  );

  const response = await client.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: `${formatExamples(examples)}Lignes à classer :\n${lines.join("\n")}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: OUTPUT_SCHEMA,
      temperature: 0,
    },
  });

  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason !== undefined && finishReason !== "STOP") {
    throw new Error(`Réponse de l'IA inutilisable (finishReason : ${finishReason}).`);
  }
  const text = response.text;
  if (!text) throw new Error("Réponse de l'IA vide.");

  const { results } = responseSchema.parse(JSON.parse(text));

  // Une ligne absente de la réponse (ou avec un index hors plage) reste `null` : elle sera
  // simplement non catégorisée, sans faire échouer tout l'import.
  const categorized: (CategorizedLine | null)[] = chunk.map(() => null);
  for (const result of results) {
    if (result.index < 0 || result.index >= chunk.length) continue;
    categorized[result.index] = {
      category: result.category,
      confidence: Math.min(1, Math.max(0, result.confidence)),
    };
  }
  return categorized;
}

/**
 * Propose une catégorie et une confiance pour chaque transaction. Le résultat est aligné sur
 * `transactions` (même ordre, `null` si l'IA n'a pas répondu pour la ligne). Les découpes en
 * lots partent en parallèle ; si l'un échoue, tout échoue (l'appelant n'écrit rien en base).
 */
export async function categorizeTransactions(
  client: GoogleGenAI,
  transactions: readonly CategorizeInput[],
  examples: readonly CategorizeExample[] = [],
): Promise<(CategorizedLine | null)[]> {
  const chunks: CategorizeInput[][] = [];
  for (let start = 0; start < transactions.length; start += CHUNK_SIZE) {
    chunks.push(transactions.slice(start, start + CHUNK_SIZE));
  }

  const results = await Promise.all(
    chunks.map((chunk) => categorizeChunk(client, chunk, examples)),
  );
  return results.flat();
}

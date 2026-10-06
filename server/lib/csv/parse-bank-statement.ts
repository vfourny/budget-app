import type {
  CsvLineErrorCode,
  CsvParseError,
  ParsedBankStatement,
  ParsedTransaction,
} from "@server/lib/csv/types";
import type { AmountColumns, CsvFormatConfig } from "@shared/csv-format";

/** Sépare les colonnes d'un libellé composé ("libellé simplifié — informations complémentaires"). */
const LABEL_SEPARATOR = " — ";

/** Erreur de lecture d'une ligne : un code (pas de texte) + la valeur fautive éventuelle. */
class CsvLineError extends Error {
  constructor(
    readonly code: CsvLineErrorCode,
    readonly value = "",
  ) {
    super(code);
  }
}

/** Découpe une ligne CSV en respectant les champs entre guillemets : un délimiteur ou un
 * guillemet à l'intérieur d'un champ cité ne coupe pas la ligne, et `""` à l'intérieur d'un
 * champ cité est un guillemet échappé. Nécessaire ici car certains exports (BoursoBank) citent
 * des champs contenant d'autres ponctuations que le délimiteur. */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/** "-1 500,00" / "+8640,00" / "892.18" → centimes. Supprime les espaces (séparateur de
 * milliers), normalise le séparateur décimal, puis arrondit après multiplication par 100 —
 * jamais de float pour de l'argent. Retourne `null` pour une colonne vide (cas débit/crédit non
 * concerné par la ligne). */
function parseAmountToCents(
  raw: string,
  decimalSeparator: CsvFormatConfig["decimalSeparator"],
): number | null {
  const cleaned = raw.trim().replace(/\s/g, "");
  if (cleaned === "") return null;

  const normalized = decimalSeparator === "," ? cleaned.replace(",", ".") : cleaned;
  const value = Number(normalized);
  if (Number.isNaN(value)) throw new CsvLineError("INVALID_AMOUNT", raw);

  return Math.round(value * 100);
}

function parseDate(raw: string, format: CsvFormatConfig["dateFormat"]): Date {
  const parts = format === "yyyy-mm-dd" ? raw.split("-") : raw.split("/").reverse();
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) throw new CsvLineError("INVALID_DATE", raw);
  return new Date(Date.UTC(year, month - 1, day));
}

function extractAmountCents(
  fields: string[],
  amount: AmountColumns,
  decimalSeparator: CsvFormatConfig["decimalSeparator"],
): number {
  if (amount.kind === "signed") {
    const value = parseAmountToCents(fields[amount.column], decimalSeparator);
    if (value === null) throw new CsvLineError("MISSING_AMOUNT");
    return value;
  }

  const debit = parseAmountToCents(fields[amount.debit], decimalSeparator);
  const credit = parseAmountToCents(fields[amount.credit], decimalSeparator);
  if (debit === null && credit === null) throw new CsvLineError("EMPTY_DEBIT_CREDIT");
  // Débit toujours négatif, crédit toujours positif, que la banque signe la colonne débit ou non.
  return Math.abs(credit ?? 0) - Math.abs(debit ?? 0);
}

/** Parse un relevé CSV brut selon le format de colonnes d'une banque (`CsvFormat` en base). Une
 * ligne illisible (date ou montant invalide) est écartée et reportée dans `errors` plutôt que
 * d'interrompre tout l'import : l'écran de relecture pourra la signaler pour correction
 * manuelle au lieu de bloquer les autres lignes valides. */
export function parseBankStatement(csvText: string, config: CsvFormatConfig): ParsedBankStatement {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");
  const dataLines = config.hasHeader ? lines.slice(1) : lines;

  const transactions: ParsedTransaction[] = [];
  const errors: CsvParseError[] = [];

  dataLines.forEach((line, index) => {
    const lineNumber = index + (config.hasHeader ? 2 : 1);
    try {
      const fields = splitCsvLine(line, config.delimiter);
      const date = parseDate(fields[config.dateColumn], config.dateFormat);
      const label = config.labelColumns
        .map((column) => fields[column]?.trim() ?? "")
        .filter((field) => field !== "")
        .join(LABEL_SEPARATOR);
      const amountCents = extractAmountCents(fields, config.amount, config.decimalSeparator);

      transactions.push({
        date,
        label,
        amountCents,
        month: date.getUTCMonth() + 1,
        year: date.getUTCFullYear(),
      });
    } catch (error) {
      errors.push({
        line: lineNumber,
        code: error instanceof CsvLineError ? error.code : "UNKNOWN",
        value: error instanceof CsvLineError ? error.value : "",
        raw: line,
      });
    }
  });

  return { transactions, errors };
}

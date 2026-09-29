import type {
  AmountColumns,
  BankCsvConfig,
  CsvParseError,
  ParsedBankStatement,
  ParsedTransaction,
} from "@server/lib/csv/types";

/** Découpe une ligne CSV en respectant les champs entre guillemets : un délimiteur ou un
 * guillemet à l'intérieur d'un champ cité ne coupe pas la ligne, et `""` à l'intérieur d'un
 * champ cité est un guillemet échappé. Nécessaire ici car certains exports (BoursoBank) citent
 * des champs contenant d'autres ponctuations que le délimiteur. */
function splitCsvLine(line: string, delimiter: string): string[] {
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
  decimalSeparator: BankCsvConfig["decimalSeparator"],
): number | null {
  const cleaned = raw.trim().replace(/\s/g, "");
  if (cleaned === "") return null;

  const normalized = decimalSeparator === "," ? cleaned.replace(",", ".") : cleaned;
  const value = Number(normalized);
  if (Number.isNaN(value)) throw new Error(`Montant invalide : "${raw}"`);

  return Math.round(value * 100);
}

function parseDate(raw: string, format: BankCsvConfig["dateFormat"]): Date {
  const parts = format === "yyyy-mm-dd" ? raw.split("-") : raw.split("/").reverse();
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) throw new Error(`Date invalide : "${raw}"`);
  return new Date(Date.UTC(year, month - 1, day));
}

function extractAmountCents(
  fields: string[],
  amount: AmountColumns,
  decimalSeparator: BankCsvConfig["decimalSeparator"],
): number {
  if (amount.kind === "signed") {
    const value = parseAmountToCents(fields[amount.column], decimalSeparator);
    if (value === null) throw new Error("Montant manquant");
    return value;
  }

  const debit = parseAmountToCents(fields[amount.debit], decimalSeparator);
  const credit = parseAmountToCents(fields[amount.credit], decimalSeparator);
  const value = debit ?? credit;
  if (value === null) throw new Error("Débit et crédit vides");
  return value;
}

/** Parse un relevé CSV brut selon le mapping de colonnes d'une banque (voir `banks/`). Une
 * ligne illisible (date ou montant invalide) est écartée et reportée dans `errors` plutôt que
 * d'interrompre tout l'import : l'écran de relecture pourra la signaler pour correction
 * manuelle au lieu de bloquer les autres lignes valides. */
export function parseBankStatement(csvText: string, config: BankCsvConfig): ParsedBankStatement {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");
  const dataLines = config.hasHeader ? lines.slice(1) : lines;

  const transactions: ParsedTransaction[] = [];
  const errors: CsvParseError[] = [];

  dataLines.forEach((line, index) => {
    const lineNumber = index + (config.hasHeader ? 2 : 1);
    try {
      const fields = splitCsvLine(line, config.delimiter);
      const date = parseDate(fields[config.columns.date], config.dateFormat);
      const label =
        typeof config.columns.label === "number"
          ? fields[config.columns.label]
          : config.columns.label(fields);
      const amountCents = extractAmountCents(
        fields,
        config.columns.amount,
        config.decimalSeparator,
      );

      transactions.push({
        date,
        label: label.trim(),
        amountCents,
        month: date.getUTCMonth() + 1,
        year: date.getUTCFullYear(),
      });
    } catch (error) {
      errors.push({
        line: lineNumber,
        message: error instanceof Error ? error.message : "Erreur inconnue",
        raw: line,
      });
    }
  });

  return { transactions, errors };
}

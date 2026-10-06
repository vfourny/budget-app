import type { Transaction } from "@server/generated/prisma/client";

/** Une transaction normalisée à partir d'une ligne de relevé, avant écriture en base
 * (`accountType`, `category`, `importBatchId` sont ajoutés plus tard, à la validation de
 * l'import — voir `ImportBatch` dans le schéma Prisma). */
export type ParsedTransaction = Pick<
  Transaction,
  "date" | "label" | "amountCents" | "month" | "year"
>;

/** Pourquoi une ligne est écartée : un **code**, traduit côté front (`i18n/fr/errors.ts`). */
export type CsvLineErrorCode =
  "INVALID_AMOUNT" | "INVALID_DATE" | "MISSING_AMOUNT" | "EMPTY_DEBIT_CREDIT" | "UNKNOWN";

export interface CsvParseError {
  /** Numéro de ligne dans le fichier source (1-based, en-tête compris). */
  line: number;
  code: CsvLineErrorCode;
  /** Valeur fautive (montant ou date brut) pour `INVALID_*`, sinon vide. */
  value: string;
  raw: string;
}

export interface ParsedBankStatement {
  transactions: ParsedTransaction[];
  errors: CsvParseError[];
}

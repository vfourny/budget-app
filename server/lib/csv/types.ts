/** Une transaction normalisée à partir d'une ligne de relevé, avant écriture en base
 * (`bankAccountId`, `category`, `importBatchId` sont ajoutés plus tard, à la validation de
 * l'import — voir `ImportBatch` dans le schéma Prisma). */
export interface ParsedTransaction {
  date: Date;
  label: string;
  /** Montant en centimes, signé : négatif = débit. */
  amountCents: number;
  month: number;
  year: number;
}

export interface CsvParseError {
  /** Numéro de ligne dans le fichier source (1-based, en-tête compris). */
  line: number;
  message: string;
  raw: string;
}

export interface ParsedBankStatement {
  transactions: ParsedTransaction[];
  errors: CsvParseError[];
}

/** Comment extraire le montant d'une ligne : soit une colonne unique déjà signée, soit deux
 * colonnes débit/crédit — chacune déjà signée dans les exports observés (ex. "-115,00" /
 * "+8640,00"), une seule des deux étant renseignée par ligne. */
export type AmountColumns =
  { kind: "signed"; column: number } | { kind: "debitCredit"; debit: number; credit: number };

export interface BankCsvColumns {
  date: number;
  /** Index de colonne, ou fonction pour composer un libellé plus riche (ex. concaténer avec
   * un champ "informations complémentaires") — utile pour la catégorisation automatique. */
  label: number | ((fields: string[]) => string);
  amount: AmountColumns;
}

/** Mapping de colonnes propre à une banque. Ajouter une banque = ajouter un fichier dans
 * `banks/` + une entrée dans `banks/index.ts`, sans toucher au parseur générique. */
export interface BankCsvConfig {
  /** Doit correspondre à `BankAccount.bank` pour la sélection automatique du mapping. */
  bank: string;
  delimiter: string;
  hasHeader: boolean;
  dateFormat: "yyyy-mm-dd" | "dd/mm/yyyy";
  decimalSeparator: "," | ".";
  columns: BankCsvColumns;
}

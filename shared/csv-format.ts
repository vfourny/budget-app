import { z } from "zod";

const columnIndex = z.number().int().min(0).max(99);

/** Comment extraire le montant d'une ligne : soit une colonne unique déjà signée, soit deux
 * colonnes débit/crédit — chacune déjà signée dans les exports observés (ex. "-115,00" /
 * "+8640,00"), une seule des deux étant renseignée par ligne. */
const amountColumnsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("signed"), column: columnIndex }),
  z.object({ kind: z.literal("debitCredit"), debit: columnIndex, credit: columnIndex }),
]);

/** Comment lire les colonnes d'un export CSV de banque. Un objet JSON pur : il est stocké en base
 * (`CsvFormat.config`) et validé par ce schéma à chaque lecture. Les colonnes sont désignées par
 * leur **index** (pas par leur nom) : certains exports ont des noms d'en-tête en double. */
export const csvFormatConfigSchema = z.object({
  delimiter: z.enum([";", ",", "\t"]),
  hasHeader: z.boolean(),
  dateFormat: z.enum(["yyyy-mm-dd", "dd/mm/yyyy"]),
  decimalSeparator: z.enum([",", "."]),
  dateColumn: columnIndex,
  /** Colonnes concaténées pour former le libellé (les champs vides sont ignorés) : plus de
   * contexte pour la catégorisation automatique qu'une seule colonne. */
  labelColumns: z.array(columnIndex).min(1).max(5),
  amount: amountColumnsSchema,
});

export type CsvFormatConfig = z.infer<typeof csvFormatConfigSchema>;
export type AmountColumns = CsvFormatConfig["amount"];

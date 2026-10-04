import type { TransactionCategory } from "@server/generated/prisma/enums";

export interface AggregatedRow {
  category: TransactionCategory | null;
  /** Centimes, signé : négatif = débit. */
  amountCents: number;
}

export interface PeriodTotals {
  /** Somme des crédits. */
  revenueCents: number;
  /** Somme des débits hors épargne (positive). */
  expenseCents: number;
  /** Somme des débits « Épargne long terme » (positive). */
  savingsCents: number;
  /** Dépenses par catégorie (hors épargne), de la plus grosse à la plus petite. */
  byCategory: { category: TransactionCategory | null; expenseCents: number }[];
}

/**
 * Totaux d'une période (hypothèses V1 : tout crédit est un revenu ; un débit en
 * `LONG_TERM_SAVINGS` est de l'épargne, pas une dépense). Que des entiers en centimes.
 */
export function aggregatePeriod(rows: readonly AggregatedRow[]): PeriodTotals {
  let revenueCents = 0;
  let expenseCents = 0;
  let savingsCents = 0;
  const perCategory = new Map<TransactionCategory | null, number>();

  for (const row of rows) {
    if (row.amountCents > 0) {
      revenueCents += row.amountCents;
    } else if (row.category === "LONG_TERM_SAVINGS") {
      savingsCents -= row.amountCents;
    } else {
      expenseCents -= row.amountCents;
      perCategory.set(row.category, (perCategory.get(row.category) ?? 0) - row.amountCents);
    }
  }

  const byCategory = [...perCategory.entries()]
    .map(([category, total]) => ({ category, expenseCents: total }))
    .sort((a, b) => b.expenseCents - a.expenseCents);

  return { revenueCents, expenseCents, savingsCents, byCategory };
}

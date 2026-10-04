import {
  REVENUE_LINES,
  envelopeOf,
  isSavingsEnvelope,
  type RevenueLineKey,
} from "@/lib/budget-rules";
import type { Envelope, TransactionCategory } from "@server/generated/prisma/enums";

export interface AggregatedRow {
  category: TransactionCategory | null;
  /** Centimes, signé : négatif = débit. */
  amountCents: number;
}

export interface PeriodTotals {
  /** Somme des crédits. */
  revenueCents: number;
  /** Détail des crédits selon `REVENUE_LINES` (+ `"other"` s'il reste un montant) : somme = `revenueCents`. */
  revenueLines: { key: RevenueLineKey; cents: number }[];
  /** Somme des débits hors enveloppes d'épargne (positive). */
  expenseCents: number;
  /** Somme des débits des enveloppes d'épargne (positive). */
  savingsCents: number;
  /** Débits par enveloppe selon `ENVELOPE_CATEGORIES` (positifs). */
  byEnvelope: Record<Envelope, number>;
  /** Débits par catégorie (épargne comprise), du plus gros au plus petit. */
  debitsByCategory: { category: TransactionCategory | null; cents: number }[];
}

/**
 * Totaux d'une période. Toutes les règles (enveloppe d'une catégorie, épargne ou dépense, lignes
 * de revenus) viennent de `@/lib/budget-rules`. Hypothèse V1 : tout crédit est un revenu.
 * Que des entiers en centimes.
 */
export function aggregatePeriod(rows: readonly AggregatedRow[]): PeriodTotals {
  let revenueCents = 0;
  let expenseCents = 0;
  let savingsCents = 0;
  const byEnvelope: Record<Envelope, number> = {
    CURRENT_EXPENSES: 0,
    LEISURE: 0,
    TRAINING: 0,
    SAFETY_SAVINGS: 0,
    LONG_TERM_SAVINGS: 0,
  };
  const debits = new Map<TransactionCategory | null, number>();
  const credits = new Map<TransactionCategory | null, number>();

  for (const row of rows) {
    if (row.amountCents > 0) {
      revenueCents += row.amountCents;
      credits.set(row.category, (credits.get(row.category) ?? 0) + row.amountCents);
      continue;
    }
    const cents = -row.amountCents;
    const envelope = envelopeOf(row.category);
    if (envelope) byEnvelope[envelope] += cents;
    // Débit d'une catégorie rangée dans aucune enveloppe : compté en dépense, sans jauge.
    if (envelope && isSavingsEnvelope(envelope)) savingsCents += cents;
    else expenseCents += cents;
    debits.set(row.category, (debits.get(row.category) ?? 0) + cents);
  }

  const revenueLines: PeriodTotals["revenueLines"] = REVENUE_LINES.map((line) => ({
    key: line.key,
    cents: line.categories.reduce((sum, category) => sum + (credits.get(category) ?? 0), 0),
  }));
  const otherCents = revenueCents - revenueLines.reduce((sum, line) => sum + line.cents, 0);
  if (otherCents !== 0) revenueLines.push({ key: "other", cents: otherCents });

  const debitsByCategory = [...debits.entries()]
    .map(([category, cents]) => ({ category, cents }))
    .sort((a, b) => b.cents - a.cents);

  return { revenueCents, revenueLines, expenseCents, savingsCents, byEnvelope, debitsByCategory };
}

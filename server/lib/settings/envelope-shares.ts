import type { Envelope } from "@server/generated/prisma/enums";

/** Les 5 enveloppes qui reçoivent une part du revenu (méthode des 5 comptes). */
export const BUDGET_ENVELOPES = [
  "CURRENT_EXPENSES",
  "LEISURE",
  "TRAINING",
  "SAFETY_SAVINGS",
  "LONG_TERM_SAVINGS",
] as const satisfies readonly Envelope[];

export type BudgetEnvelope = (typeof BUDGET_ENVELOPES)[number];

/** Parts par défaut (en % du revenu mensuel) : 100 % du revenu affecté. */
export const DEFAULT_ENVELOPE_PERCENTS = {
  CURRENT_EXPENSES: 60,
  LEISURE: 10,
  TRAINING: 10,
  SAFETY_SAVINGS: 10,
  LONG_TERM_SAVINGS: 10,
} as const satisfies Record<BudgetEnvelope, number>;

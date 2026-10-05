import type { Envelope } from "@server/generated/prisma/enums";

/** Les 5 enveloppes qui reçoivent une part du revenu (méthode des 5 comptes). */
export const BUDGET_ENVELOPES = [
  "CURRENT_EXPENSES",
  "LEISURE",
  "TRAINING",
  "SAFETY_SAVINGS",
  "LONG_TERM_SAVINGS",
] as const satisfies readonly Envelope[];

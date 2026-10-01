import type { Envelope } from "@server/generated/prisma/enums";

/** Enveloppes qui reçoivent une part du revenu (méthode des 5 comptes) ; `PRO` n'en fait pas partie. */
export const BUDGET_ENVELOPES = [
  "DEPENSES_COURANTES",
  "LOISIRS",
  "FORMATION",
  "EPARGNE_SECURITE",
  "EPARGNE_LONG_TERME",
] as const satisfies readonly Envelope[];

export type BudgetEnvelope = (typeof BUDGET_ENVELOPES)[number];

/** Parts par défaut (en % du revenu mensuel) : 95 % affectés, 5 % restent libres. */
export const DEFAULT_ENVELOPE_PERCENTS = {
  DEPENSES_COURANTES: 55,
  LOISIRS: 10,
  FORMATION: 10,
  EPARGNE_SECURITE: 10,
  EPARGNE_LONG_TERME: 10,
} as const satisfies Record<BudgetEnvelope, number>;

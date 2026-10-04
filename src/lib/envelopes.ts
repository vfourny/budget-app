import type { Envelope } from "@server/generated/prisma/enums";

export const ENVELOPE_LABELS = {
  CURRENT_EXPENSES: "Dépenses courantes",
  LEISURE: "Loisirs",
  TRAINING: "Formation",
  SAFETY_SAVINGS: "Épargne sécurité",
  LONG_TERM_SAVINGS: "Épargne long terme",
} as const satisfies Record<Envelope, string>;

/** Ordre d'affichage des enveloppes. */
export const ENVELOPE_ORDER = Object.keys(ENVELOPE_LABELS) as Envelope[];

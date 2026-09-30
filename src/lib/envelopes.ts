import type { Envelope } from "@server/generated/prisma/enums";

export const ENVELOPE_LABELS = {
  DEPENSES_COURANTES: "Dépenses courantes",
  LOISIRS: "Loisirs",
  FORMATION: "Formation",
  EPARGNE_SECURITE: "Épargne sécurité",
  EPARGNE_LONG_TERME: "Épargne long terme",
  PRO: "Pro",
} as const satisfies Record<Envelope, string>;

/** Ordre d'affichage des enveloppes. */
export const ENVELOPE_ORDER = Object.keys(ENVELOPE_LABELS) as Envelope[];

import { ENVELOPE_CATEGORIES, isSavingsEnvelope } from "@/lib/budget-rules";
import { TRANSACTION_CATEGORIES } from "@/lib/categories";
import type { Envelope } from "@server/generated/prisma/enums";

/** Préfixe « Enveloppe » : évite de confondre une enveloppe avec une catégorie du même nom. */
export const ENVELOPE_LABELS = {
  CURRENT_EXPENSES: "Enveloppe dépenses courantes",
  LEISURE: "Enveloppe loisirs",
  TRAINING: "Enveloppe formation",
  SAFETY_SAVINGS: "Enveloppe épargne sécurité",
  LONG_TERM_SAVINGS: "Enveloppe épargne long terme",
} as const satisfies Record<Envelope, string>;

/** Ordre d'affichage des enveloppes. */
export const ENVELOPE_ORDER = Object.keys(ENVELOPE_LABELS) as Envelope[];

/**
 * Explication de la somme « réelle » d'une enveloppe (tooltip des jauges), déduite de
 * `ENVELOPE_CATEGORIES` (budget-rules) : si on déplace une catégorie, le texte suit.
 */
export function envelopeSourceText(envelope: Envelope): string {
  const labels = ENVELOPE_CATEGORIES[envelope].map(
    (category) => TRANSACTION_CATEGORIES[category].label,
  );
  if (labels.length === 0) {
    return "Aucune catégorie rattachée pour l'instant : le réel reste à 0 €.";
  }
  const kind = isSavingsEnvelope(envelope) ? "virements d'épargne" : "dépenses";
  return `Total des ${kind} des catégories : ${labels.join(", ")}.`;
}

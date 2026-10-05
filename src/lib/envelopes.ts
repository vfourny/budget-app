import { ENVELOPE_CATEGORIES, isSavingsEnvelope } from "@shared/budget-rules";
import { fr } from "@/lib/i18n/fr";
import type { Envelope } from "@server/generated/prisma/enums";

/** Ordre d'affichage des enveloppes = ordre des clés de `fr.envelopes`. */
export const ENVELOPE_ORDER = Object.keys(fr.envelopes) as Envelope[];

/**
 * Explication de la somme « réelle » d'une enveloppe (tooltip des jauges), déduite de
 * `ENVELOPE_CATEGORIES` (budget-rules) : si on déplace une catégorie, le texte suit.
 */
export function envelopeSourceText(envelope: Envelope): string {
  const labels = ENVELOPE_CATEGORIES[envelope].map((category) => fr.categories[category]);
  const text = fr.personal.envelopeSource;
  if (labels.length === 0) return text.empty;
  return isSavingsEnvelope(envelope) ? text.savings(labels) : text.expenses(labels);
}

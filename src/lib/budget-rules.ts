import type { Envelope, TransactionCategory } from "@server/generated/prisma/enums";

/*
 * ✏️ RÈGLES DU BUDGET : le seul fichier à modifier pour changer ce qui est cumulé ou affiché.
 *
 * Partagé front + serveur (fichier pur, sans dépendance runtime) : les totaux, les jauges, les
 * tooltips et la page Catégories suivent après redéploiement. Rien n'est stocké en base : une
 * règle modifiée s'applique à tout l'historique.
 * Libellés des catégories : `@/lib/categories`. Libellés des enveloppes : `@/lib/envelopes`.
 */

/**
 * Catégories cumulées dans chaque enveloppe (jauges de la page Perso).
 * Pour déplacer une catégorie : la retirer d'un tableau et l'ajouter dans un autre.
 * Une catégorie ajoutée à l'enum Prisma doit être rangée ici à la main (aucun garde-fou).
 * Une catégorie ne peut être que dans une seule enveloppe (vérifié au chargement, voir plus bas).
 */
export const ENVELOPE_CATEGORIES = {
  CURRENT_EXPENSES: [
    "RENT",
    "FUEL",
    "BANK_INSURANCE",
    "GROCERIES",
    "CLOTHING_CARE",
    "HEALTH",
    "TRANSPORT",
    "TAXES",
    "OTHER_SUBSCRIPTIONS",
    "OTHER",
  ],
  LEISURE: ["RESTAURANT", "NIGHTLIFE", "LEISURE"],
  TRAINING: ["TRAINING"],
  SAFETY_SAVINGS: ["SHORT_TERM_SAVINGS"],
  LONG_TERM_SAVINGS: ["LONG_TERM_SAVINGS"],
} as const satisfies Record<Envelope, readonly TransactionCategory[]>;

/** Enveloppes d'épargne : leurs débits comptent en « Épargne », pas en « Dépenses ». */
export const SAVINGS_ENVELOPES = [
  "SAFETY_SAVINGS",
  "LONG_TERM_SAVINGS",
] as const satisfies readonly Envelope[];

/**
 * Catégories affichées dans la card « Par catégorie » de la page Perso (triées par montant à
 * l'affichage, seules celles qui ont des débits apparaissent). Retirer une ligne la masque.
 */
export const CATEGORY_CARD_CATEGORIES = [
  "RENT",
  "FUEL",
  "BANK_INSURANCE",
  "RESTAURANT",
  "GROCERIES",
  "NIGHTLIFE",
  "LEISURE",
  "TRAINING",
  "CLOTHING_CARE",
  "HEALTH",
  "TRANSPORT",
  "TAXES",
  "OTHER_SUBSCRIPTIONS",
  "OTHER",
] as const satisfies readonly TransactionCategory[];

/**
 * Lignes du détail de la card Revenus (dans cet ordre, toujours affichées même à 0 €).
 * Les crédits d'une autre catégorie ou sans catégorie vont dans une ligne « Autres ».
 */
export const REVENUE_LINES = [
  { label: "Salaire", categories: ["SALARY_PAYMENT", "BNC_PAYMENT"] },
  { label: "Vacations", categories: ["VACATION_PAYMENT"] },
  { label: "Remboursement pro", categories: ["PROFESSIONAL_REFUND"] },
  { label: "Autre remboursement", categories: ["REFUND"] },
] as const satisfies readonly { label: string; categories: readonly TransactionCategory[] }[];

// ---------------------------------------------------------------------------------------------
// Dérivé des règles ci-dessus : rien à modifier en dessous.
// ---------------------------------------------------------------------------------------------

const ENVELOPE_BY_CATEGORY = new Map<TransactionCategory, Envelope>();
for (const [envelope, categories] of Object.entries(ENVELOPE_CATEGORIES)) {
  for (const category of categories) {
    const existing = ENVELOPE_BY_CATEGORY.get(category);
    if (existing) {
      // Erreur au démarrage (front et serveur) plutôt qu'un double comptage silencieux.
      throw new Error(
        `budget-rules : la catégorie ${category} est dans deux enveloppes (${existing} et ${envelope}).`,
      );
    }
    ENVELOPE_BY_CATEGORY.set(category, envelope as Envelope);
  }
}

/**
 * Enveloppe d'une catégorie, `null` si elle n'est rangée dans aucune (revenus, ou catégorie
 * ajoutée à l'enum sans être rangée ici) : ses débits comptent alors en « Dépenses » sans jauge.
 */
export function envelopeOf(category: TransactionCategory | null): Envelope | null {
  return (category && ENVELOPE_BY_CATEGORY.get(category)) ?? null;
}

export function isSavingsEnvelope(envelope: Envelope): boolean {
  return SAVINGS_ENVELOPES.some((savingsEnvelope) => savingsEnvelope === envelope);
}

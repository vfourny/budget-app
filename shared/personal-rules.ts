import type { Envelope, TransactionCategory } from "@server/generated/prisma/enums";

/*
 * ✏️ RÈGLES DU BUDGET : le seul fichier à modifier pour changer ce qui est cumulé ou affiché.
 *
 * Partagé front + serveur (fichier pur, sans dépendance runtime) : les totaux, les jauges, les
 * tooltips et la page Catégories suivent après redéploiement. Rien n'est stocké en base : une
 * règle modifiée s'applique à tout l'historique.
 * Aucun texte affiché ici : tous les libellés (catégories, enveloppes, lignes de revenus) vivent
 * dans `@/lib/i18n/fr`.
 */

/**
 * Catégories cumulées dans chaque enveloppe (jauges de la page Perso).
 * Pour déplacer une catégorie : la retirer d'un tableau et l'ajouter dans un autre.
 * Une catégorie ajoutée à l'enum Prisma doit être rangée ici à la main (aucun garde-fou).
 * Une catégorie ne peut être que dans une seule enveloppe (vérifié au chargement, voir plus bas).
 */
export const ENVELOPE_CATEGORIES = {
  CURRENT_EXPENSES: [
    "RENT_PAID",
    "FUEL",
    "BANK_INSURANCE",
    "GROCERIES",
    "HEALTH",
    "TRANSPORT",
    "TAXES",
    "ENERGY",
    "TELECOM",
    "INTERNET",
    "OTHER",
  ],
  LEISURE: ["RESTAURANT", "NIGHTLIFE", "LEISURE", "CLOTHING_CARE", "OTHER_SUBSCRIPTIONS"],
  TRAINING: ["TRAINING"],
  SAFETY_SAVINGS: ["SHORT_TERM_SAVINGS"],
  LONG_TERM_SAVINGS: ["LONG_TERM_SAVINGS"],
} as const satisfies Record<Envelope, readonly TransactionCategory[]>;

/**
 * Parts du revenu mensuel recommandées par enveloppe, en % (100 % du revenu affecté). Valeurs
 * utilisées tant que rien n'est configuré dans Réglages, et par le bouton « Valeurs par défaut ».
 */
export const DEFAULT_ENVELOPE_PERCENTS = {
  CURRENT_EXPENSES: 60,
  LEISURE: 10,
  TRAINING: 10,
  SAFETY_SAVINGS: 10,
  LONG_TERM_SAVINGS: 10,
} as const satisfies Record<Envelope, number>;

/** Enveloppes d'épargne : leurs débits comptent en « Épargne », pas en « Dépenses ». */
export const SAVINGS_ENVELOPES = [
  "SAFETY_SAVINGS",
  "LONG_TERM_SAVINGS",
] as const satisfies readonly Envelope[];

/**
 * Catégories affichées dans la card « Par catégorie » de la page Perso (triées par montant à
 * l'affichage ; toutes sont affichées, même à 0 €). Retirer une ligne la masque.
 */
export const CATEGORY_CARD_CATEGORIES = [
  "FUEL",
  "BANK_INSURANCE",
  "RESTAURANT",
  "GROCERIES",
  "NIGHTLIFE",
  "LEISURE",
  "CLOTHING_CARE",
  "HEALTH",
  "TRANSPORT",
  "TAXES",
  "OTHER_SUBSCRIPTIONS",
  "OTHER",
] as const satisfies readonly TransactionCategory[];

/**
 * Catégories détaillées dans la card « Charges fixes » de la page Perso (dans cet ordre, toujours
 * affichées même à 0 €). Le total de la card est la somme de ces catégories.
 */
export const FIXED_CHARGES_CATEGORIES = [
  "RENT_PAID",
  "ENERGY",
  "TELECOM",
  "INTERNET",
] as const satisfies readonly TransactionCategory[];

/**
 * Lignes du détail de la card Revenus (dans cet ordre, toujours affichées même à 0 €).
 * Les crédits d'une autre catégorie ou sans catégorie vont dans la ligne `"other"`.
 */
export const REVENUE_LINES = [
  { key: "salary", categories: ["SALARY_PAYMENT", "BNC_PAYMENT"] },
  { key: "vacations", categories: ["VACATION_PAYMENT"] },
  { key: "professionalRefund", categories: ["PROFESSIONAL_REFUND"] },
  { key: "otherRefund", categories: ["REFUND"] },
] as const satisfies readonly { key: string; categories: readonly TransactionCategory[] }[];

/**
 * Catégories signalées « À vérifier » dans les tableaux de transactions des dashboards (badge +
 * filtre), en plus des lignes sans catégorie : fourre-tout à reclasser si possible.
 */
const TO_CHECK_CATEGORIES = [
  "OTHER",
  "PROFESSIONAL_OTHER",
] as const satisfies readonly TransactionCategory[];

/** Clé d'une ligne de revenus (`"other"` = le reste). Libellés : `@/lib/i18n/fr`. */
export type RevenueLineKey = (typeof REVENUE_LINES)[number]["key"] | "other";

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
        `personal-rules : la catégorie ${category} est dans deux enveloppes (${existing} et ${envelope}).`,
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

/** Ligne à signaler dans un tableau de dashboard : sans catégorie ou dans `TO_CHECK_CATEGORIES`. */
export function isToCheck(category: TransactionCategory | null): boolean {
  return category === null || TO_CHECK_CATEGORIES.some((toCheck) => toCheck === category);
}

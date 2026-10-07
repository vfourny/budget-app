import type { TransactionCategory } from "@server/generated/prisma/enums";
import type { ApartmentCategory } from "@shared/account-categories";

/*
 * ✏️ RÈGLES DES APPARTEMENTS (voir `docs/plan-appartements.md`, R2, R3, R7, R10) : le seul fichier à
 * modifier pour changer ce qui est cumulé dans une ligne du tableau, les seuils ou les tolérances.
 *
 * Partagé front + serveur (fichier pur, sans dépendance runtime). Montants en centimes, taux en
 * points de base. Aucun texte affiché ici : les libellés vivent dans `@/lib/i18n/fr`.
 */

/**
 * Ligne du tableau d'un appartement alimentée par chaque catégorie de transaction (R2). Les lignes
 * « Frais de gérance » ne figurent pas ici : elles viennent de la facture de gérance (R12), pas d'une
 * transaction. `satisfies Record<ApartmentCategory, …>` : `tsc` échoue si une catégorie du compte
 * appartement n'est pas rangée.
 */
export const APARTMENT_CATEGORY_LINES = {
  APT_RENT_RECEIVED: "rentReceived",
  APT_LOAN_REPAYMENT: "loanRepayment",
  APT_LOAN_INSURANCE: "loanInsurance",
  APT_OWNER_CONTRIBUTION: "ownerContribution",
  ENERGY: "electricity",
  APT_HOME_INSURANCE: "homeInsurance",
  INTERNET: "internetBox",
  APT_CONDO_FEES: "condoFees",
  APT_PROPERTY_TAX: "propertyTax",
  APT_CFE: "cfe",
  APT_BANK_FEES: "bankFees",
  APT_REGULARIZATION: "regularization",
  APT_OTHER: "other",
} as const satisfies Record<ApartmentCategory, string>;

export type ApartmentLineKey = (typeof APARTMENT_CATEGORY_LINES)[ApartmentCategory];

/**
 * Ligne du tableau d'une transaction (R2). Sans catégorie (ou hors liste du compte appartement), elle
 * compte en « Autres » (R4) : elle reste signalée « À vérifier » dans les listes de transactions.
 */
export function apartmentLineOf(category: TransactionCategory | null): ApartmentLineKey {
  const entry = Object.entries(APARTMENT_CATEGORY_LINES).find(([key]) => key === category);
  return entry?.[1] ?? "other";
}

/**
 * Lignes de charges par section du tableau (R2), dans l'ordre d'affichage. Toutes entrent dans le
 * différentiel (R5) ; les charges annuelles ne comptent que le mois de leur paiement (R3).
 */
export const APARTMENT_CHARGE_LINES = {
  fixed: ["electricity", "homeInsurance", "internetBox", "condoFees"],
  annual: ["propertyTax", "cfe"],
  other: ["bankFees", "regularization", "other"],
} as const satisfies Record<string, readonly ApartmentLineKey[]>;

/** Mois (1-12) où les charges annuelles du prévisionnel sont comptées (R3) : taxe foncière en octobre, CFE en décembre. */
export const PROPERTY_TAX_MONTH = 10;
export const CFE_MONTH = 12;

/** Tolérance (en centimes, 1 €) du rapprochement d'une échéance de prêt avec le tableau d'amortissement (R7). */
export const LOAN_MATCH_TOLERANCE_CENTS = 100;

/** Plafond de recettes du micro-BIC par année, en centimes (R10). À titre indicatif : à valider avec le comptable. */
const MICRO_BIC_CEILINGS_CENTS = {
  2025: 7_770_000,
  2026: 8_360_000,
} as const satisfies Record<number, number>;

/** Seuil de recettes du statut LMP, en centimes (R10). La condition sur 50 % des revenus n'est pas calculée. */
export const LMP_THRESHOLD_CENTS = 2_300_000;

/** Plafond micro-BIC d'une année ; une année inconnue prend la dernière connue (ou la première si elle est antérieure). */
export function microBicCeilingCents(year: number): number {
  const years = Object.keys(MICRO_BIC_CEILINGS_CENTS)
    .map(Number)
    .sort((a, b) => a - b);
  const known = years.filter((knownYear) => knownYear <= year).at(-1) ?? years[0];
  return MICRO_BIC_CEILINGS_CENTS[known as keyof typeof MICRO_BIC_CEILINGS_CENTS];
}

import type {
  ApartmentForecastLine,
  TransactionCategory,
} from '@server/generated/prisma/enums'
import type { ApartmentCategory } from '@shared/transactions/categories'

/*
 * ✏️ RÈGLES DES APPARTEMENTS (voir `docs/fonctionnel.md` › Appartements, R2, R3, R7) : le seul fichier à
 * modifier pour changer ce qui est cumulé dans une ligne du tableau ou les tolérances. Les seuils
 * légaux du LMNP (R10), données annuelles, sont dans `@shared/fiscal/lmnp`.
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
const APARTMENT_CATEGORY_LINES = {
  APT_RENT_RECEIVED: 'rentReceived',
  APT_LOAN_REPAYMENT: 'loanRepayment',
  APT_LOAN_INSURANCE: 'loanInsurance',
  APT_OWNER_CONTRIBUTION: 'ownerContribution',
  ENERGY: 'electricity',
  APT_HOME_INSURANCE: 'homeInsurance',
  INTERNET: 'internetBox',
  APT_CONDO_FEES: 'condoFees',
  APT_PROPERTY_TAX: 'propertyTax',
  APT_CFE: 'cfe',
  APT_BANK_FEES: 'bankFees',
  APT_REGULARIZATION: 'regularization',
  APT_OTHER: 'other',
} as const satisfies Record<ApartmentCategory, string>

export type ApartmentLineKey =
  (typeof APARTMENT_CATEGORY_LINES)[ApartmentCategory]

/**
 * Ligne du tableau d'une transaction (R2). Sans catégorie (ou hors liste du compte appartement), elle
 * compte en « Autres » (R4) : elle reste signalée « À vérifier » dans les listes de transactions.
 */
export function apartmentLineOf(
  category: TransactionCategory | null,
): ApartmentLineKey {
  return category !== null && isApartmentLineCategory(category)
    ? APARTMENT_CATEGORY_LINES[category]
    : 'other'
}

function isApartmentLineCategory(
  category: TransactionCategory,
): category is ApartmentCategory {
  return category in APARTMENT_CATEGORY_LINES
}

/**
 * Lignes de charges par section du tableau (R2), dans l'ordre d'affichage. Toutes entrent dans le
 * différentiel (R5) ; les charges annuelles ne comptent que le mois de leur paiement (R3).
 */
export const APARTMENT_CHARGE_LINES = {
  fixed: ['electricity', 'homeInsurance', 'internetBox', 'condoFees'],
  annual: ['propertyTax', 'cfe'],
  other: ['bankFees', 'regularization', 'other'],
} as const satisfies Record<string, readonly ApartmentLineKey[]>

/**
 * Lignes saisissables dans l'éditeur du prévisionnel (R3), dans l'ordre d'affichage. Le crédit vient
 * du tableau d'amortissement et les frais de gérance du loyer × taux : ils ne se saisissent pas.
 */
export const APARTMENT_FORECAST_LINES = [
  'grossRent',
  ...APARTMENT_CHARGE_LINES.fixed,
  ...APARTMENT_CHARGE_LINES.annual,
  ...APARTMENT_CHARGE_LINES.other,
] as const satisfies readonly ApartmentForecastLine[]

/**
 * Lignes dont la saisie vaut jusqu'à la suivante (montants qui changent rarement) : sans saisie du
 * mois, le prévu reprend la dernière saisie antérieure, sinon 0. Les autres lignes ne valent que pour
 * leur mois (sans saisie : historique, R3).
 */
export const CARRIED_FORECAST_LINES = [
  'grossRent',
  'propertyTax',
  'cfe',
] as const satisfies readonly ApartmentForecastLine[]

/** Mois (1-12) où les charges annuelles du prévisionnel sont comptées (R3) : taxe foncière en octobre, CFE en décembre. */
export const PROPERTY_TAX_MONTH = 10
export const CFE_MONTH = 12

/** Tolérance (en centimes, 1 €) du rapprochement d'une échéance de prêt avec le tableau d'amortissement (R7). */
export const LOAN_MATCH_TOLERANCE_CENTS = 100

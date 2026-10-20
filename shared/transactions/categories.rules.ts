import type {
  AccountType,
  TransactionCategory,
} from '@server/generated/prisma/enums'

/*
 * Catégories proposées selon le type de compte : une seule liste en base (`TransactionCategory`),
 * et une liste par type de compte (`ACCOUNT_CATEGORIES`), **dans l'ordre d'affichage** (colonnes du Google Sheet).
 * Sert au sélecteur de la relecture, au prompt Gemini et à la validation de `setCategory`.
 *
 * Une catégorie peut figurer dans plusieurs comptes. Ajouter un type de compte :
 * l'ajouter à l'enum `AccountType`, `tsc` impose alors sa liste ici.
 * Ajouter une catégorie à l'enum : `tsc` impose de la ranger dans au moins un compte.
 */
const ACCOUNT_CATEGORIES = {
  PERSONAL: [
    'RENT_PAID',
    'FUEL',
    'BANK_INSURANCE',
    'RESTAURANT',
    'GROCERIES',
    'NIGHTLIFE',
    'LEISURE',
    'TRAINING',
    'CLOTHING_CARE',
    'HEALTH',
    'TRANSPORT',
    'TAXES',
    'OTHER_SUBSCRIPTIONS',
    'ENERGY',
    'TELECOM',
    'INTERNET',
    'OTHER',
    'SHORT_TERM_SAVINGS',
    'LONG_TERM_SAVINGS',
    'SALARY_PAYMENT',
    'BNC_PAYMENT',
    'VACATION_PAYMENT',
    'REFUND',
    'PROFESSIONAL_REFUND',
    'APARTMENT_CONTRIBUTION',
  ],
  PROFESSIONAL: [
    'CLIENT_PAYMENT',
    'PROFESSIONAL_OTHER_CREDIT',
    'PROFESSIONAL_INSURANCE',
    'PROFESSIONAL_ACCOUNTANT',
    'PROFESSIONAL_BANK_FEES',
    'PROFESSIONAL_EQUIPMENT',
    'PROFESSIONAL_SOFTWARE',
    'PROFESSIONAL_MEALS',
    'PROFESSIONAL_TRAVEL',
    'PROFESSIONAL_TAXES',
    'PROFESSIONAL_OTHER',
    'NET_SALARY_TRANSFER',
    'BNC_WITHDRAWAL',
    'MIXED_COSTS_REFUND',
    'URSSAF',
    'SUPPLEMENTARY_PENSION',
    'HEALTH_COVER',
    'DISABILITY_COVER',
    'WITHHOLDING_TAX',
    'VAT_PAYMENT',
  ],
  APARTMENT: [
    'APT_RENT_RECEIVED',
    'APT_LOAN_REPAYMENT',
    'APT_LOAN_INSURANCE',
    'APT_HOME_INSURANCE',
    'APT_CONDO_FEES',
    'APT_PROPERTY_TAX',
    'APT_CFE',
    'APT_BANK_FEES',
    'APT_REGULARIZATION',
    'APT_OWNER_CONTRIBUTION',
    'APT_OTHER',
    'ENERGY',
    'INTERNET',
  ],
} as const satisfies Record<AccountType, readonly TransactionCategory[]>

type AccountCategory<T extends AccountType> =
  (typeof ACCOUNT_CATEGORIES)[T][number]
export type PersonalCategory = AccountCategory<'PERSONAL'>
export type ProfessionalCategory = AccountCategory<'PROFESSIONAL'>
export type ApartmentCategory = AccountCategory<'APARTMENT'>

type AssertNever<T extends never> = T

/**
 * Garde-fou de compilation : chaque valeur de l'enum doit figurer dans au moins un compte.
 * @public
 */
export type EveryCategoryIsAssigned = AssertNever<
  Exclude<TransactionCategory, AccountCategory<AccountType>>
>

/** Catégories proposées pour un type de compte, dans l'ordre d'affichage (sélecteurs, prompt). */
export function categoriesOf<T extends AccountType>(
  accountType: T,
): (typeof ACCOUNT_CATEGORIES)[T] {
  return ACCOUNT_CATEGORIES[accountType]
}

/**
 * La catégorie peut-elle être choisie pour une transaction de ce type de compte ? Type guard : après
 * `isCategoryOf('APARTMENT', c)`, `c` est une `ApartmentCategory`.
 */
export function isCategoryOf<T extends AccountType>(
  accountType: T,
  category: TransactionCategory,
): category is AccountCategory<T> {
  return ACCOUNT_CATEGORIES[accountType].some(
    (accountCategory) => accountCategory === category,
  )
}

/**
 * Catégories signalées « À vérifier » dans les tableaux de transactions des dashboards (badge +
 * filtre), en plus des lignes sans catégorie : le fourre-tout de chaque compte, à reclasser si possible.
 */
const TO_CHECK_CATEGORIES = [
  'OTHER',
  'PROFESSIONAL_OTHER',
  'APT_OTHER',
] as const satisfies readonly TransactionCategory[]

/** Ligne à signaler dans un tableau de dashboard : sans catégorie ou dans `TO_CHECK_CATEGORIES`. */
export function isToCheck(category: TransactionCategory | null): boolean {
  return (
    category === null ||
    TO_CHECK_CATEGORIES.some((toCheck) => toCheck === category)
  )
}

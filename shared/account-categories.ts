import type { AccountType, TransactionCategory } from "@server/generated/prisma/enums";

/*
 * Catégories proposées selon le type de compte : une seule liste en base (`TransactionCategory`),
 * et une liste par type de compte (`ACCOUNT_CATEGORIES`). Sert au sélecteur de la relecture, au
 * prompt Gemini et à la validation de `setCategory`.
 *
 * Une catégorie peut figurer dans plusieurs comptes. Ajouter un type de compte (appartements…) :
 * l'ajouter à l'enum `AccountType`, `tsc` impose alors sa liste ici.
 * Ajouter une catégorie à l'enum : `tsc` impose de la ranger dans au moins un compte.
 */
const ACCOUNT_CATEGORIES = {
  PERSONAL: [
    "RENT_PAID",
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
    "ENERGY",
    "TELECOM",
    "INTERNET",
    "OTHER",
    "LONG_TERM_SAVINGS",
    "SALARY_PAYMENT",
    "BNC_PAYMENT",
    "VACATION_PAYMENT",
    "REFUND",
    "PROFESSIONAL_REFUND",
    "TRAINING",
    "SHORT_TERM_SAVINGS",
  ],
  PROFESSIONAL: [
    "CLIENT_PAYMENT",
    "PROFESSIONAL_OTHER_CREDIT",
    "PROFESSIONAL_INSURANCE",
    "PROFESSIONAL_ACCOUNTANT",
    "PROFESSIONAL_BANK_FEES",
    "PROFESSIONAL_EQUIPMENT",
    "PROFESSIONAL_SOFTWARE",
    "PROFESSIONAL_MEALS",
    "PROFESSIONAL_TRAVEL",
    "PROFESSIONAL_TAXES",
    "PROFESSIONAL_OTHER",
    "NET_SALARY_TRANSFER",
    "BNC_WITHDRAWAL",
    "MIXED_COSTS_REFUND",
    "URSSAF",
    "SUPPLEMENTARY_PENSION",
    "HEALTH_COVER",
    "DISABILITY_COVER",
    "WITHHOLDING_TAX",
    "VAT_PAYMENT",
  ],
} as const satisfies Record<AccountType, readonly TransactionCategory[]>;

type AccountCategory<T extends AccountType> = (typeof ACCOUNT_CATEGORIES)[T][number];
export type ProfessionalCategory = AccountCategory<"PROFESSIONAL">;

type AssertNever<T extends never> = T;

/**
 * Garde-fou de compilation : chaque valeur de l'enum doit figurer dans au moins un compte.
 * @public
 */
export type EveryCategoryIsAssigned = AssertNever<
  Exclude<TransactionCategory, AccountCategory<AccountType>>
>;

/** La catégorie peut-elle être choisie pour une transaction de ce type de compte ? */
export function isCategoryOf(accountType: AccountType, category: TransactionCategory): boolean {
  return ACCOUNT_CATEGORIES[accountType].some((accountCategory) => accountCategory === category);
}

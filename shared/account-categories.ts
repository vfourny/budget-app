import type { AccountType, TransactionCategory } from "@server/generated/prisma/enums";

/*
 * Catégories proposées selon le type de compte : une seule liste en base (`TransactionCategory`),
 * mais un relevé pro ne propose que les catégories pro, et un relevé perso toutes les autres.
 * Sert au sélecteur de la relecture, au prompt Gemini et à la validation de `setCategory`.
 */

/** Catégories du compte pro (Stygma). Toute autre catégorie est une catégorie perso. */
export const PROFESSIONAL_CATEGORIES = [
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
] as const satisfies readonly TransactionCategory[];

export type ProfessionalCategory = (typeof PROFESSIONAL_CATEGORIES)[number];

export function isProfessionalCategory(
  category: TransactionCategory,
): category is ProfessionalCategory {
  return PROFESSIONAL_CATEGORIES.some((professionalCategory) => professionalCategory === category);
}

/** La catégorie peut-elle être choisie pour une transaction de ce type de compte ? */
export function isCategoryOf(accountType: AccountType, category: TransactionCategory): boolean {
  return isProfessionalCategory(category) === (accountType === "PROFESSIONAL");
}

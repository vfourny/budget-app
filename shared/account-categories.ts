import type { AccountType, TransactionCategory } from "@server/generated/prisma/enums";

/*
 * Catégories proposées selon le type de compte : une seule liste en base (`TransactionCategory`),
 * mais un relevé pro ne propose que les catégories pro, et un relevé perso toutes les autres.
 * Sert au sélecteur de la relecture, au prompt Gemini et à la validation de `setCategory`.
 */

/** Catégories du compte pro (Stygma). Toute autre catégorie est une catégorie perso. */
export const PRO_CATEGORIES = [
  "CLIENT_PAYMENT",
  "PRO_OTHER_CREDIT",
  "PRO_INSURANCE",
  "PRO_ACCOUNTANT",
  "PRO_BANK_FEES",
  "PRO_EQUIPMENT",
  "PRO_SOFTWARE",
  "PRO_MEALS",
  "PRO_TRAVEL",
  "PRO_TAXES",
  "PRO_OTHER",
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

export type ProCategory = (typeof PRO_CATEGORIES)[number];

export function isProCategory(category: TransactionCategory): category is ProCategory {
  return PRO_CATEGORIES.some((proCategory) => proCategory === category);
}

/** La catégorie peut-elle être choisie pour une transaction de ce type de compte ? */
export function isCategoryOf(accountType: AccountType, category: TransactionCategory): boolean {
  return isProCategory(category) === (accountType === "PROFESSIONAL");
}

import type { TransactionCategory } from "@server/generated/prisma/enums";

/**
 * Libellé de chaque catégorie (liste figée, alignée sur l'enum Prisma).
 * L'ordre des clés = ordre d'affichage (colonnes du Google Sheet, listes de choix).
 * Le rattachement aux enveloppes et l'affichage dans les cards : `@/lib/budget-rules`.
 * `satisfies Record<TransactionCategory, …>` : erreur TS si une catégorie de l'enum manque ou
 * est en trop, tout en gardant les valeurs littérales (autocomplétion sur `label`).
 */
export const TRANSACTION_CATEGORIES = {
  RENT: { label: "Loyer" },
  FUEL: { label: "Essence" },
  BANK_INSURANCE: { label: "Banque et assurance" },
  RESTAURANT: { label: "Restaurant" },
  GROCERIES: { label: "Alimentaire" },
  NIGHTLIFE: { label: "Soirée" },
  LEISURE: { label: "Loisirs" },
  TRAINING: { label: "Formation" },
  CLOTHING_CARE: { label: "Vêtements & Soins" },
  HEALTH: { label: "Santé" },
  TRANSPORT: { label: "Transport" },
  TAXES: { label: "Impôt et Taxes" },
  OTHER_SUBSCRIPTIONS: { label: "Abonnements divers" },
  OTHER: { label: "Autres" },
  SHORT_TERM_SAVINGS: { label: "Épargne court terme" },
  LONG_TERM_SAVINGS: { label: "Épargne long terme" },
  SALARY_PAYMENT: { label: "Versement salaire" },
  BNC_PAYMENT: { label: "Versement BNC" },
  VACATION_PAYMENT: { label: "Versement vacation" },
  REFUND: { label: "Autre remboursement" },
  PROFESSIONAL_REFUND: { label: "Remboursement pro" },
} as const satisfies Record<TransactionCategory, { label: string }>;

export const TRANSACTION_CATEGORY_ORDER = Object.keys(
  TRANSACTION_CATEGORIES,
) as TransactionCategory[];

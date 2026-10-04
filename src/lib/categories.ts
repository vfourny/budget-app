import type { Envelope, TransactionCategory } from "@server/generated/prisma/enums";

/**
 * Libellé et enveloppe de chaque catégorie (liste figée, alignée sur l'enum Prisma).
 * L'ordre des clés = ordre d'affichage (colonnes du Google Sheet).
 * L'enveloppe de rattachement est une hypothèse, à ajuster ici si besoin ; `null` pour les
 * catégories de revenu (salaire, BNC, remboursement), qui n'appartiennent à aucune enveloppe de dépense.
 * `satisfies Record<TransactionCategory, …>` : erreur TS si une catégorie de l'enum manque ou
 * est en trop, tout en gardant les valeurs littérales (autocomplétion sur `label` / `envelope`).
 */
export const TRANSACTION_CATEGORIES = {
  FUEL: { label: "Essence", envelope: "CURRENT_EXPENSES" },
  BANK_INSURANCE: { label: "Banque et assurance", envelope: "CURRENT_EXPENSES" },
  RESTAURANT: { label: "Restaurant", envelope: "LEISURE" },
  GROCERIES: { label: "Alimentaire", envelope: "CURRENT_EXPENSES" },
  NIGHTLIFE: { label: "Soirée", envelope: "LEISURE" },
  LEISURE: { label: "Loisirs", envelope: "LEISURE" },
  CLOTHING_CARE: { label: "Vêtements & Soins", envelope: "CURRENT_EXPENSES" },
  HEALTH: { label: "Santé", envelope: "CURRENT_EXPENSES" },
  TRANSPORT: { label: "Transport", envelope: "CURRENT_EXPENSES" },
  TAXES: { label: "Impôt et Taxes", envelope: "CURRENT_EXPENSES" },
  OTHER_SUBSCRIPTIONS: { label: "Abonnements divers", envelope: "CURRENT_EXPENSES" },
  OTHER: { label: "Autres", envelope: "CURRENT_EXPENSES" },
  LONG_TERM_SAVINGS: { label: "Épargne long terme", envelope: "LONG_TERM_SAVINGS" },
  SALARY_PAYMENT: { label: "Versement salaire", envelope: null },
  BNC_PAYMENT: { label: "Versement BNC", envelope: null },
  REFUND: { label: "Remboursement", envelope: null },
} as const satisfies Record<TransactionCategory, { label: string; envelope: Envelope | null }>;

export const TRANSACTION_CATEGORY_ORDER = Object.keys(
  TRANSACTION_CATEGORIES,
) as TransactionCategory[];

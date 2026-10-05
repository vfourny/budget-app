import type { RevenueLineKey } from "@shared/budget-rules";
import type {
  AccountType,
  Envelope,
  ImportStatus,
  TransactionCategory,
} from "@server/generated/prisma/enums";

/*
 * Libellés des enums Prisma (et des lignes de revenus). Chaque dictionnaire est
 * `as const satisfies Record<Enum, string>` : `tsc` échoue si une valeur de l'enum n'a pas de
 * libellé, ou si une clé n'existe plus dans l'enum.
 */

/** Type de compte d'un relevé / d'une transaction. */
export const accountTypes = {
  PERSONAL: "Perso",
  PROFESSIONAL: "Pro (Stygma)",
} as const satisfies Record<AccountType, string>;

/** Statut d'un import (le détail « N à vérifier » est dans `imports.toReview`). */
export const importStatus = {
  PENDING_REVIEW: "À valider",
  VALIDATED: "Terminé",
} as const satisfies Record<ImportStatus, string>;

/**
 * Libellé de chaque enveloppe ; son ordre = ordre d'affichage. Préfixe « Enveloppe » : évite de
 * confondre une enveloppe avec une catégorie du même nom.
 */
export const envelopes = {
  CURRENT_EXPENSES: "Enveloppe dépenses courantes",
  LEISURE: "Enveloppe loisirs",
  TRAINING: "Enveloppe formation",
  SAFETY_SAVINGS: "Enveloppe épargne sécurité",
  LONG_TERM_SAVINGS: "Enveloppe épargne long terme",
} as const satisfies Record<Envelope, string>;

/**
 * Libellé de chaque catégorie ; l'ordre des clés = ordre d'affichage (colonnes du Google Sheet,
 * listes de choix). Rattachement aux enveloppes : `@shared/budget-rules`.
 */
export const categories = {
  RENT: "Loyer",
  FUEL: "Essence",
  BANK_INSURANCE: "Banque et assurance",
  RESTAURANT: "Restaurant",
  GROCERIES: "Alimentaire",
  NIGHTLIFE: "Soirée",
  LEISURE: "Loisirs",
  TRAINING: "Formation",
  CLOTHING_CARE: "Vêtements & Soins",
  HEALTH: "Santé",
  TRANSPORT: "Transport",
  TAXES: "Impôt et Taxes",
  OTHER_SUBSCRIPTIONS: "Abonnements divers",
  ENERGY: "Énergie",
  TELECOM: "Télécom",
  INTERNET: "Internet",
  OTHER: "Autres",
  SHORT_TERM_SAVINGS: "Épargne court terme",
  LONG_TERM_SAVINGS: "Épargne long terme",
  SALARY_PAYMENT: "Versement salaire",
  BNC_PAYMENT: "Versement BNC",
  VACATION_PAYMENT: "Versement vacation",
  REFUND: "Autre remboursement",
  PROFESSIONAL_REFUND: "Remboursement pro",
} as const satisfies Record<TransactionCategory, string>;

/** Lignes du détail de la card Revenus (clés de `REVENUE_LINES` dans budget-rules + « other »). */
export const revenueLines = {
  salary: "Salaire",
  vacations: "Vacations",
  professionalRefund: "Remboursement pro",
  otherRefund: "Autre remboursement",
  other: "Autres",
} as const satisfies Record<RevenueLineKey, string>;

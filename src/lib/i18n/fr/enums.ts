import type { RevenueLineKey } from "@shared/budget-rules";
import type {
  AccountType,
  CompanyRegime,
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

/** Statut juridique et fiscal de la société (Réglages › Pro). */
export const companyRegimes = {
  SAS_IR: "SAS à l'IR",
  SAS_IS: "SAS à l'IS",
  EURL: "EURL",
} as const satisfies Record<CompanyRegime, string>;

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
  // Compte pro (Stygma)
  CLIENT_PAYMENT: "Encaissement client",
  PRO_OTHER_CREDIT: "Autre crédit pro",
  PRO_INSURANCE: "RC Pro & assurances",
  PRO_ACCOUNTANT: "Comptable",
  PRO_BANK_FEES: "Frais bancaires",
  PRO_EQUIPMENT: "Petit matériel",
  PRO_SOFTWARE: "Logiciels & abonnements",
  PRO_MEALS: "Restauration",
  PRO_TRAVEL: "Voyages et déplacements",
  PRO_TAXES: "Impôts et taxes pro",
  PRO_OTHER: "Autres charges pro",
  NET_SALARY_TRANSFER: "Salaire net versé",
  BNC_WITHDRAWAL: "Revenus BNC prélevés",
  MIXED_COSTS_REFUND: "Remboursement frais mixtes",
  URSSAF: "URSSAF",
  SUPPLEMENTARY_PENSION: "Retraite complémentaire",
  HEALTH_COVER: "Complémentaire santé",
  DISABILITY_COVER: "Prévoyance",
  WITHHOLDING_TAX: "Prélèvement à la source",
  VAT_PAYMENT: "TVA",
} as const satisfies Record<TransactionCategory, string>;

/** Lignes du détail de la card Revenus (clés de `REVENUE_LINES` dans budget-rules + « other »). */
export const revenueLines = {
  salary: "Salaire",
  vacations: "Vacations",
  professionalRefund: "Remboursement pro",
  otherRefund: "Autre remboursement",
  other: "Autres",
} as const satisfies Record<RevenueLineKey, string>;

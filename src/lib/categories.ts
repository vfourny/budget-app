import type { Envelope, TransactionCategory } from "@server/generated/prisma/enums";

/**
 * Libellé et enveloppe de chaque catégorie (liste figée, alignée sur l'enum Prisma).
 * L'ordre des clés = ordre d'affichage (colonnes du Google Sheet).
 * L'enveloppe de rattachement est une hypothèse, à ajuster ici si besoin.
 */
export const TRANSACTION_CATEGORIES: Record<
  TransactionCategory,
  { label: string; envelope: Envelope }
> = {
  ESSENCE: { label: "Essence", envelope: "DEPENSES_COURANTES" },
  ASSURANCE: { label: "Assurance", envelope: "DEPENSES_COURANTES" },
  RESTAURANT: { label: "Restaurant", envelope: "LOISIRS" },
  ALIMENTAIRE: { label: "Alimentaire", envelope: "DEPENSES_COURANTES" },
  SOIREE: { label: "Soirée", envelope: "LOISIRS" },
  LOISIRS: { label: "Loisirs", envelope: "LOISIRS" },
  VETEMENTS_SOINS: { label: "Vêtements & Soins", envelope: "DEPENSES_COURANTES" },
  SANTE: { label: "Santé", envelope: "DEPENSES_COURANTES" },
  TRANSPORT: { label: "Transport", envelope: "DEPENSES_COURANTES" },
  IMPOTS_TAXES: { label: "Impôt et Taxes", envelope: "DEPENSES_COURANTES" },
  AUTRES_ABONNEMENTS: { label: "Autres abonnements", envelope: "DEPENSES_COURANTES" },
  AUTRES: { label: "Autres", envelope: "DEPENSES_COURANTES" },
  EPARGNE_LONG_TERME: { label: "Épargne long terme", envelope: "EPARGNE_LONG_TERME" },
};

export const TRANSACTION_CATEGORY_ORDER = Object.keys(
  TRANSACTION_CATEGORIES,
) as TransactionCategory[];

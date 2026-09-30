import type { AccountType } from "@server/generated/prisma/enums";

/** Libellé de chaque type de compte (aligné sur l'enum Prisma ; `satisfies` échoue si une valeur manque). */
export const ACCOUNT_TYPE_LABELS = {
  PERSO: "Perso",
  PRO: "Pro (Stygma)",
} as const satisfies Record<AccountType, string>;

export const ACCOUNT_TYPE_OPTIONS = (Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(
  (value) => ({ value, label: ACCOUNT_TYPE_LABELS[value] }),
);

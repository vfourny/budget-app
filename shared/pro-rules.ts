import type { CompanyRegime } from "@server/generated/prisma/enums";

/*
 * ✏️ RÈGLES DU COMPTE PRO (Stygma) : constantes partagées front + serveur (fichier pur, sans
 * dépendance runtime). Aucun libellé ici : les textes sont dans `@/lib/i18n/fr`.
 */

/** Règles d'une année (Réglages › Pro), en entiers : centimes, points de base, dm², millièmes d'€. */
export interface ProYearSettingsValues {
  regime: CompanyRegime;
  irOptionFirstYear: number;
  grossSalaryCents: number;
  employerContributionBp: number;
  employeeContributionBp: number;
  taxableNetBp: number;
  withholdingTaxBp: number;
  profitSocialChargesBp: number;
  officeAreaDm2: number;
  homeAreaDm2: number;
  mixedKeyNumerator: number;
  mixedKeyDenominator: number;
  mileageRateMilli: number;
}

/**
 * Valeurs utilisées tant qu'aucune année n'est configurée, et par « Valeurs par défaut ».
 * Exemples de la maquette : à valider avec le comptable.
 */
export const DEFAULT_PRO_YEAR_SETTINGS = {
  regime: "SAS_IR",
  irOptionFirstYear: 2026,
  grossSalaryCents: 80_000,
  employerContributionBp: 4460,
  employeeContributionBp: 2160,
  taxableNetBp: 8730,
  withholdingTaxBp: 1740,
  profitSocialChargesBp: 970,
  officeAreaDm2: 1200,
  homeAreaDm2: 5400,
  mixedKeyNumerator: 5,
  mixedKeyDenominator: 7,
  mileageRateMilli: 636,
} as const satisfies ProYearSettingsValues;

/** Statuts que l'app sait calculer (les autres sont proposés « Bientôt » dans Réglages). */
export const SUPPORTED_REGIMES = ["SAS_IR"] as const satisfies readonly CompanyRegime[];

/** Nombre maximum d'exercices avec l'option pour l'IR. */
export const IR_OPTION_MAX_YEARS = 5;

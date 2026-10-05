import type { ProCategory } from "@shared/account-categories";
import type { CompanyRegime, TransactionCategory } from "@server/generated/prisma/enums";

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

/** TVA collectée sur les factures (prestations de services), en points de base. */
export const COLLECTED_VAT_BP = 2000;

/**
 * Charges pro (catégories du relevé pro) et taux de TVA déductible de chacune, en points de base :
 * le relevé donne des montants TTC, ramenés en HT avec ce taux. 0 = pas de TVA récupérable
 * (assurance, frais bancaires, impôts, services facturés depuis l'étranger sans TVA française).
 * L'ordre = ordre des lignes « Charges pro » de l'écran Pro.
 */
export const PRO_CHARGE_VAT_BP = {
  PRO_INSURANCE: 0,
  PRO_ACCOUNTANT: 2000,
  PRO_BANK_FEES: 0,
  PRO_EQUIPMENT: 2000,
  PRO_SOFTWARE: 0,
  PRO_MEALS: 1000,
  PRO_TRAVEL: 1000,
  PRO_TAXES: 0,
  PRO_OTHER: 2000,
} as const satisfies Partial<Record<ProCategory, number>>;

export type ProChargeCategory = keyof typeof PRO_CHARGE_VAT_BP;

export const PRO_CHARGE_CATEGORIES = Object.keys(PRO_CHARGE_VAT_BP) as ProChargeCategory[];

/**
 * Frais mixtes : dépenses du compte **perso** dont Stygma rembourse une quote-part. `"area"` =
 * prorata surface bureau / logement, `"key"` = clé n/d des Réglages (5/7 par défaut).
 * L'ordre sert aussi à répartir les remboursements reçus (d'abord le loyer, etc.).
 */
export const MIXED_COSTS = [
  { category: "RENT", key: "area" },
  { category: "INTERNET", key: "key" },
  { category: "TELECOM", key: "key" },
  { category: "ENERGY", key: "key" },
] as const satisfies readonly { category: TransactionCategory; key: "area" | "key" }[];

export type MixedCostCategory = (typeof MIXED_COSTS)[number]["category"];

/**
 * Part remboursée par Stygma (points de base) selon la clé : surface bureau / logement, ou clé n/d
 * des Réglages. Utilisée par le calcul et par l'éditeur du prévisionnel.
 */
export function mixedShareBp(
  settings: Pick<
    ProYearSettingsValues,
    "officeAreaDm2" | "homeAreaDm2" | "mixedKeyNumerator" | "mixedKeyDenominator"
  >,
  key: "area" | "key",
): number {
  return key === "area"
    ? Math.round((settings.officeAreaDm2 * 10_000) / Math.max(1, settings.homeAreaDm2))
    : Math.round((settings.mixedKeyNumerator * 10_000) / Math.max(1, settings.mixedKeyDenominator));
}

/**
 * Répartition indicative des cotisations patronales entre les organismes (points de base, total
 * 10 000) : détail « dont … » du tableau prévu / réel. Tirée d'un bulletin de paie.
 */
export const EMPLOYER_CONTRIBUTION_SPLIT_BP = {
  URSSAF: 6999,
  SUPPLEMENTARY_PENSION: 1355,
  HEALTH_COVER: 1310,
  DISABILITY_COVER: 336,
} as const satisfies Partial<Record<ProCategory, number>>;

/**
 * Catégories qu'on peut prévoir mois par mois (`MonthlyForecast`) : charges pro, BNC prélevés et
 * dépenses perso des frais mixtes.
 */
export const FORECASTABLE_CATEGORIES = [
  ...PRO_CHARGE_CATEGORIES,
  "BNC_WITHDRAWAL",
  ...MIXED_COSTS.map((cost) => cost.category),
] as const satisfies readonly TransactionCategory[];

/**
 * Groupes de l'éditeur du prévisionnel : les catégories saisies ensemble, et le compte d'où viennent
 * leurs valeurs par défaut (réel N-1) : relevé pro (montants ramenés en HT) ou relevé perso.
 */
export const FORECAST_GROUPS = {
  charges: {
    accountType: "PROFESSIONAL",
    categories: [...PRO_CHARGE_CATEGORIES, "BNC_WITHDRAWAL"],
  },
  mixedCosts: { accountType: "PERSONAL", categories: MIXED_COSTS.map((cost) => cost.category) },
} as const satisfies Record<
  string,
  { accountType: "PROFESSIONAL" | "PERSONAL"; categories: readonly TransactionCategory[] }
>;

export type ForecastGroup = keyof typeof FORECAST_GROUPS;

/** Une facture est « encaissée » si un paiement du client arrive dans le mois ou les N suivants. */
export const PAYMENT_MATCH_WINDOW_MONTHS = 2;

// ---------------------------------------------------------------------------------------------
// Vérifications au chargement (front et serveur) : erreur immédiate plutôt qu'un calcul faux.
// ---------------------------------------------------------------------------------------------

const splitTotal = Object.values(EMPLOYER_CONTRIBUTION_SPLIT_BP).reduce((sum, bp) => sum + bp, 0);
if (splitTotal !== 10_000) {
  throw new Error(
    `pro-rules : EMPLOYER_CONTRIBUTION_SPLIT_BP fait ${splitTotal} au lieu de 10 000.`,
  );
}

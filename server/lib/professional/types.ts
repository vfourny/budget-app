import type { BillingLine } from "@server/generated/prisma/client";
import type { TransactionCategory } from "@server/generated/prisma/enums";
import type {
  MixedCostCategory,
  ProfessionalChargeCategory,
  ProfessionalYearSettingsValues,
} from "@shared/professional-rules";

/** Montants par catégorie, en centimes positifs (débits ou crédits selon le contexte). */
export type CategoryCents = Partial<Record<TransactionCategory, number>>;

/** Une valeur prévue et réelle. `actual` = `null` tant que le mois n'a pas de réel (mois à venir). */
export interface ForecastActual {
  forecast: number;
  actual: number | null;
}

/** Ligne de facturation (prévue ou réelle) d'un client pour le mois. */
export type BillingInput = Pick<BillingLine, "clientName" | "dailyRateCents" | "days">;

/** Tout ce qu'il faut pour calculer un mois : rien n'est lu en base dans le calcul. */
export interface ProfessionalMonthInput {
  year: number;
  /** 1-12 */
  month: number;
  /** Le mois est commencé ou passé : il a un réel (sinon, prévisionnel seul). */
  hasActual: boolean;
  settings: ProfessionalYearSettingsValues;
  forecastBilling: readonly BillingInput[];
  actualBilling: readonly BillingInput[];
  /** Débits du relevé pro du mois par catégorie (TTC, positifs). */
  professionalDebits: CategoryCents;
  /** Débits du relevé pro du même mois l'année précédente : valeurs par défaut du prévisionnel. */
  lastYearProfessionalDebits: CategoryCents;
  /** Débits du relevé perso du mois (frais mixtes : loyer, internet…). */
  persoDebits: CategoryCents;
  /** Débits perso du même mois l'année précédente : prévisionnel par défaut des frais mixtes. */
  lastYearPersoDebits: CategoryCents;
  /** Montants prévus saisis (`MonthlyForecast`), HT pour les charges pro. */
  forecasts: CategoryCents;
  /**
   * Encaissements clients du mois (crédits « Encaissement client » du relevé pro, TTC).
   * `countedCents` = la part qui vient en déduction du reste à encaisser : 0 tant que la
   * facturation n'a pas commencé dans l'app (ces virements paient des factures plus anciennes).
   */
  collections: { receivedCents: number; countedCents: number };
  /** Reste à encaisser (TTC, cumulé) au début du mois. */
  openingReceivablesCents: number;
  /** TVA à reverser du mois précédent (payée ce mois-ci). */
  previousVatDueCents: number;
  mileage: {
    /** Somme des trajets du mois. */
    tripsKm: number;
    /** Somme des trajets du même mois l'année précédente. */
    lastYearTripsKm: number;
    /** Km prévus saisis (`MileageForecast`), `null` = valeur par défaut (N-1). */
    forecastKm: number | null;
  };
}

export interface ClientBilling {
  clientName: string;
  forecast: { days: number; amountCents: number };
  actual: { days: number; amountCents: number } | null;
  /** TTC réel (prévu pour un mois à venir). */
  ttcCents: number;
}

export interface ChargeRow {
  category: ProfessionalChargeCategory;
  /** Taux de TVA déductible (points de base). */
  vatBp: number;
  /** HT. */
  amount: ForecastActual;
}

export interface MixedCostRow {
  category: MixedCostCategory;
  keyType: "area" | "key";
  /** Part remboursée par Stygma, en points de base (2222 = 22,22 %). */
  shareBp: number;
  /** Dépense perso du mois. */
  spent: ForecastActual;
  /** Part due par Stygma. */
  due: ForecastActual;
  /** Remboursé (débits « Remboursement frais mixtes » du relevé pro, répartis ligne par ligne). */
  paidCents: number | null;
}

export interface ProfessionalMonth {
  year: number;
  month: number;
  hasActual: boolean;
  /** Règles de l'année utilisées (taux, clés), pour les explications de l'écran. */
  settings: ProfessionalYearSettingsValues;
  /** Chiffre d'affaires HT (jours × TJM). */
  revenue: ForecastActual;
  billing: {
    clients: ClientBilling[];
    /** Demi-journées facturées (réel) ou prévues (mois à venir). */
    days: number;
    /** Facturé HT (réel). */
    invoicedCents: number;
    /** Facturé TTC du mois : réel, ou prévu pour un mois à venir. */
    invoicedTtcCents: number;
    /** Encaissé TTC dans le mois (virements « Encaissement client »), 0 pour un mois à venir. */
    collectedTtcCents: number;
    /**
     * Reste à encaisser TTC **cumulé** à la fin du mois : tout le facturé moins tout l'encaissé
     * depuis le début de la facturation (les clients paient 1 à 2 mois plus tard). `null` pour un
     * mois à venir.
     */
    receivablesCents: number | null;
  };
  charges: {
    rows: ChargeRow[];
    /** Frais mixtes : ligne de charge = remboursements versés (prévu = part due prévue). */
    mixedCosts: ForecastActual;
    total: ForecastActual;
  };
  remuneration: {
    bncWithdrawal: ForecastActual;
    grossSalary: ForecastActual;
    employerContributions: ForecastActual;
    /** Détail des cotisations patronales par organisme (`EMPLOYER_CONTRIBUTION_SPLIT_BP`). */
    employerContributionSplit: { category: string; amount: ForecastActual }[];
    employeeContributions: ForecastActual;
    netSalary: ForecastActual;
    withholdingTax: ForecastActual;
  };
  vat: {
    collected: ForecastActual;
    deductible: ForecastActual;
    due: ForecastActual;
    payment: ForecastActual;
  };
  profit: ForecastActual;
  /** Bénéfice − BNC prélevés : ce qui reste dans la société. */
  retained: ForecastActual;
  /** Charges sociales sur la quote-part de bénéfice (réglées en perso). */
  profitSocialCharges: ForecastActual;
  mixedCosts: { rows: MixedCostRow[]; leftToRefundCents: number };
  mileage: {
    forecastKm: number;
    actualKm: number | null;
    rateMilli: number;
    amount: ForecastActual;
  };
}

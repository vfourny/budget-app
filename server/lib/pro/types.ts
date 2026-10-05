import type { TransactionCategory } from "@server/generated/prisma/enums";
import type {
  MixedCostCategory,
  ProChargeCategory,
  ProYearSettingsValues,
} from "@shared/pro-rules";

/** Montants par catégorie, en centimes positifs (débits ou crédits selon le contexte). */
export type CategoryCents = Partial<Record<TransactionCategory, number>>;

/** Une valeur prévue et réelle. `actual` = `null` tant que le mois n'a pas de réel (mois à venir). */
export interface Amount {
  forecast: number;
  actual: number | null;
}

/** Ligne de facturation (prévue ou réelle) d'un client pour le mois. */
export interface BillingInput {
  clientId: string;
  clientName: string;
  dailyRateCents: number;
  /** Demi-journées (3,5 j = 7). */
  halfDays: number;
}

/** Tout ce qu'il faut pour calculer un mois : rien n'est lu en base dans le calcul. */
export interface ProMonthInput {
  year: number;
  /** 1-12 */
  month: number;
  /** Le mois est commencé ou passé : il a un réel (sinon, prévisionnel seul). */
  hasActual: boolean;
  settings: ProYearSettingsValues;
  forecastBilling: readonly BillingInput[];
  actualBilling: readonly BillingInput[];
  /** Débits du relevé pro du mois par catégorie (TTC, positifs). */
  proDebits: CategoryCents;
  /** Débits du relevé pro du même mois l'année précédente : valeurs par défaut du prévisionnel. */
  lastYearProDebits: CategoryCents;
  /** Débits du relevé perso du mois (frais mixtes : loyer, internet…). */
  persoDebits: CategoryCents;
  /** Débits perso du même mois l'année précédente : prévisionnel par défaut des frais mixtes. */
  lastYearPersoDebits: CategoryCents;
  /** Montants prévus saisis (`MonthlyForecast`), HT pour les charges pro. */
  forecasts: CategoryCents;
  /** Encaissements (TTC) attribués aux factures du mois, par client (voir `match-payments`). */
  paidByClient: Readonly<Record<string, number>>;
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

export type InvoiceStatus = "TO_INVOICE" | "NOT_INVOICED" | "PENDING" | "PAID";

export interface ClientBilling {
  clientId: string;
  clientName: string;
  forecast: { halfDays: number; amountCents: number };
  actual: { halfDays: number; amountCents: number } | null;
  status: InvoiceStatus;
  /** TTC de la facture réelle (0 sans réel). */
  ttcCents: number;
  /** Encaissé (TTC) sur cette facture. */
  paidCents: number;
}

export interface ChargeRow {
  category: ProChargeCategory;
  /** Taux de TVA déductible (points de base). */
  vatBp: number;
  /** HT. */
  amount: Amount;
}

export interface MixedCostRow {
  category: MixedCostCategory;
  keyType: "area" | "key";
  /** Part remboursée par Stygma, en points de base (2222 = 22,22 %). */
  shareBp: number;
  /** Dépense perso du mois. */
  spent: Amount;
  /** Part due par Stygma. */
  due: Amount;
  /** Remboursé (débits « Remboursement frais mixtes » du relevé pro, répartis ligne par ligne). */
  paidCents: number | null;
}

export interface ProMonth {
  year: number;
  month: number;
  hasActual: boolean;
  /** Règles de l'année utilisées (taux, clés), pour les explications de l'écran. */
  settings: ProYearSettingsValues;
  /** Chiffre d'affaires HT (jours × TJM). */
  revenue: Amount;
  billing: {
    clients: ClientBilling[];
    /** Demi-journées facturées (réel) ou prévues (mois à venir). */
    halfDays: number;
    invoicedCents: number;
    collectedTtcCents: number;
    remainingTtcCents: number;
  };
  charges: {
    rows: ChargeRow[];
    /** Frais mixtes : ligne de charge = remboursements versés (prévu = part due prévue). */
    mixedCosts: Amount;
    total: Amount;
  };
  remuneration: {
    bncWithdrawal: Amount;
    grossSalary: Amount;
    employerContributions: Amount;
    /** Détail des cotisations patronales par organisme (`EMPLOYER_CONTRIBUTION_SPLIT_BP`). */
    employerContributionSplit: { category: string; amount: Amount }[];
    employeeContributions: Amount;
    netSalary: Amount;
    withholdingTax: Amount;
  };
  vat: { collected: Amount; deductible: Amount; due: Amount; payment: Amount };
  profit: Amount;
  /** Bénéfice − BNC prélevés : ce qui reste dans la société. */
  retained: Amount;
  /** Charges sociales sur la quote-part de bénéfice (réglées en perso). */
  profitSocialCharges: Amount;
  mixedCosts: { rows: MixedCostRow[]; leftToRefundCents: number };
  mileage: {
    forecastKm: number;
    actualKm: number | null;
    rateMilli: number;
    amount: Amount;
  };
}

import { splitLoanPayment, type LoanInstallment } from "@shared/apartment-loan";
import {
  APARTMENT_CHARGE_LINES,
  CFE_MONTH,
  PROPERTY_TAX_MONTH,
  apartmentLineOf,
} from "@shared/apartment-rules";
import {
  ZERO_LINES,
  type ApartmentColumn,
  type ApartmentLines,
  type ApartmentRecord,
  type ApartmentTransaction,
  type ManagementInvoiceRecord,
} from "@server/lib/apartments/types";

/**
 * Lignes de charges mensuelles dont le prévu vient de l'historique (R3, H2) : électricité,
 * assurance habitation, box, copropriété et frais bancaires.
 */
export const MONTHLY_CHARGE_LINES = [
  ...APARTMENT_CHARGE_LINES.fixed,
  "bankFees",
] as const satisfies readonly (keyof ApartmentLines)[];

export type MonthlyChargeBasis = Record<(typeof MONTHLY_CHARGE_LINES)[number], number>;

/** Échéance du tableau d'amortissement du mois, `undefined` hors tableau ou sans prêt. */
function installmentOf(
  schedule: readonly LoanInstallment[],
  year: number,
  month: number,
): LoanInstallment | undefined {
  return schedule.find((row) => row.year === year && row.month === month);
}

/** Différentiel (R5) : loyer net − crédit − charges. Les frais de gérance sont déjà dans le loyer net. */
function differentialOf(lines: ApartmentLines): number {
  return (
    lines.netRent -
    lines.loanCapital -
    lines.loanInterest -
    lines.loanInsurance -
    lines.regularization -
    lines.electricity -
    lines.homeInsurance -
    lines.internetBox -
    lines.condoFees -
    lines.bankFees -
    lines.other -
    lines.propertyTax -
    lines.cfe
  );
}

function toColumn(lines: ApartmentLines, openingBalanceCents: number): ApartmentColumn {
  const differentialCents = differentialOf(lines);
  return {
    lines,
    loanTotalCents: lines.loanCapital + lines.loanInterest + lines.loanInsurance,
    differentialCents,
    effortCents: Math.max(0, -differentialCents),
    openingBalanceCents,
    closingBalanceCents: openingBalanceCents + differentialCents + lines.ownerContribution,
  };
}

interface MonthContext {
  apartment: ApartmentRecord;
  schedule: readonly LoanInstallment[];
  year: number;
  month: number;
  /** Solde du compte au début du mois (chaîné par `computeApartmentYear`). */
  openingBalanceCents: number;
}

/**
 * Réalisé d'un mois clos (R2, R4, R7, R12) : somme des transactions validées par ligne. Une
 * transaction sans catégorie compte en « Autres ». Une charge = −(somme des montants signés).
 * Le prêt est ventilé d'après le tableau d'amortissement : intérêts (et assurance si elle est prélevée
 * avec l'échéance) viennent du tableau, le capital est le reste du montant prélevé, pour que le solde
 * calculé reste égal au solde bancaire.
 */
export function actualLines(
  { apartment, schedule, year, month }: Omit<MonthContext, "openingBalanceCents">,
  transactions: readonly Pick<ApartmentTransaction, "category" | "amountCents">[],
  invoice: ManagementInvoiceRecord | null,
): ApartmentLines {
  const lines: ApartmentLines = { ...ZERO_LINES };
  const installment = installmentOf(schedule, year, month);

  for (const { category, amountCents } of transactions) {
    const line = apartmentLineOf(category);
    switch (line) {
      case "rentReceived":
        lines.netRent += amountCents;
        break;
      case "ownerContribution":
        lines.ownerContribution += amountCents;
        break;
      case "loanInsurance":
        lines.loanInsurance -= amountCents;
        break;
      case "loanRepayment": {
        const debit = -amountCents;
        if (installment && debit > 0) {
          const split = splitLoanPayment(debit, installment, apartment.creditInsuranceCents);
          lines.loanInterest += split.interestCents;
          lines.loanInsurance += split.insuranceCents;
          lines.loanCapital += debit - split.interestCents - split.insuranceCents;
        } else {
          lines.loanCapital += debit;
        }
        break;
      }
      default:
        lines[line] -= amountCents;
    }
  }

  lines.managementFees = invoice?.feesCents ?? 0;
  lines.extraManagementFees = invoice?.extraFeesCents ?? 0;
  lines.grossRent = lines.netRent + lines.managementFees + lines.extraManagementFees;
  return lines;
}

/**
 * Prévu d'un mois (R3) : loyer et gérance des Réglages, échéance du tableau d'amortissement,
 * assurance emprunteur, taxe foncière (octobre) et CFE (décembre), charges mensuelles d'après
 * l'historique (`basis`). Le prévu suppose le loyer intégralement perçu (pas de vacance).
 */
function forecastLines(
  { apartment, schedule, year, month }: Omit<MonthContext, "openingBalanceCents">,
  basis: MonthlyChargeBasis,
): ApartmentLines {
  const managementFees =
    apartment.managerName === null
      ? 0
      : Math.round((apartment.rentCents * apartment.managementFeeBps) / 10_000);
  const installment = installmentOf(schedule, year, month);
  return {
    ...ZERO_LINES,
    ...basis,
    grossRent: apartment.rentCents,
    managementFees,
    netRent: apartment.rentCents - managementFees,
    loanCapital: installment?.capitalCents ?? 0,
    loanInterest: installment?.interestCents ?? 0,
    loanInsurance: apartment.loan ? apartment.creditInsuranceCents : 0,
    propertyTax: month === PROPERTY_TAX_MONTH ? apartment.propertyTaxCents : 0,
    cfe: month === CFE_MONTH ? apartment.cfeCents : 0,
  };
}

export interface MonthResult {
  year: number;
  month: number;
  /** Mois antérieur au mois en cours : seul un mois clos a un réalisé (R1). */
  closed: boolean;
  forecast: ApartmentColumn;
  actual: ApartmentColumn | null;
  /** Facture de gérance (R12) saisie, `null` sinon ou si le bien est en direct. */
  invoice: ManagementInvoiceRecord | null;
  /** Mois clos d'un bien géré sans facture saisie (« Facture de gérance à saisir »). */
  missingManagementInvoice: boolean;
}

/**
 * Un appartement, un mois : prévu et réalisé (`null` si le mois n'est pas clos). Le solde de début
 * est le même pour les deux colonnes ; l'apport prévu est l'effort d'épargne prévu (R2), donc le
 * solde de fin prévu est `début + max(0, différentiel)`.
 */
export function computeMonth(
  context: MonthContext,
  input: {
    closed: boolean;
    basis: MonthlyChargeBasis;
    transactions: readonly Pick<ApartmentTransaction, "category" | "amountCents">[];
    invoice: ManagementInvoiceRecord | null;
  },
): MonthResult {
  const forecastRaw = forecastLines(context, input.basis);
  const forecastDifferential = differentialOf(forecastRaw);
  const forecast = toColumn(
    { ...forecastRaw, ownerContribution: Math.max(0, -forecastDifferential) },
    context.openingBalanceCents,
  );

  const managed = context.apartment.managerName !== null;
  const invoice = managed ? input.invoice : null;
  const actual = input.closed
    ? toColumn(actualLines(context, input.transactions, invoice), context.openingBalanceCents)
    : null;

  return {
    year: context.year,
    month: context.month,
    closed: input.closed,
    forecast,
    actual,
    invoice,
    missingManagementInvoice: input.closed && managed && invoice === null,
  };
}

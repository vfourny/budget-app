import { loanSchedule, type LoanInstallment } from "@shared/apartment-loan";
import {
  MONTHLY_CHARGE_LINES,
  actualLines,
  computeMonth,
  type MonthResult,
  type MonthlyChargeBasis,
} from "@server/lib/apartments/compute-month";
import { isActiveIn, isMonthClosed, type YearMonth } from "@server/lib/apartments/period";
import {
  ZERO_LINES,
  type ApartmentColumn,
  type ApartmentLines,
  type ApartmentRecord,
  type ApartmentTransaction,
  type ManagementInvoiceRecord,
} from "@server/lib/apartments/types";

const monthKey = (year: number, month: number) => `${year}-${month}`;

/** Prévu des charges mensuelles (R3, H2) : réel du même mois N-1, sinon moyenne des autres mois clos, sinon 0. */
function monthlyChargeBasis(
  actualByMonth: ReadonlyMap<string, ApartmentLines>,
  year: number,
  month: number,
): MonthlyChargeBasis {
  const previousYear = actualByMonth.get(monthKey(year - 1, month));
  const others = [...actualByMonth].filter(([key]) => key !== monthKey(year, month));
  const basis: MonthlyChargeBasis = {
    electricity: 0,
    homeInsurance: 0,
    internetBox: 0,
    condoFees: 0,
    bankFees: 0,
  };
  for (const line of MONTHLY_CHARGE_LINES) {
    if (previousYear) {
      basis[line] = previousYear[line];
    } else if (others.length > 0) {
      basis[line] = Math.round(
        others.reduce((sum, [, lines]) => sum + lines[line], 0) / others.length,
      );
    }
  }
  return basis;
}

export interface ApartmentYearInput {
  apartment: ApartmentRecord;
  year: number;
  now: YearMonth;
  /** Solde réel du compte au 1er janvier de `year` (0 si non saisi, R5). */
  openingBalanceCents: number;
  /** Transactions validées de l'appartement, de `year - 1` et `year` (le prévu s'appuie sur N-1). */
  transactions: readonly ApartmentTransaction[];
  /** Factures de gérance de `year`, par mois. */
  invoices: ReadonlyMap<number, ManagementInvoiceRecord>;
}

/**
 * Les mois actifs d'un appartement pour une année (R1), chaînés par le solde (R5) : le solde de
 * début d'un mois est le solde de début d'année + Σ (différentiel + apport) des mois précédents.
 */
export function computeApartmentYear(input: ApartmentYearInput): MonthResult[] {
  const { apartment, year, now } = input;
  const schedule: LoanInstallment[] = apartment.loan ? loanSchedule(apartment.loan) : [];

  const byMonth = new Map<string, ApartmentTransaction[]>();
  for (const transaction of input.transactions) {
    const key = monthKey(transaction.year, transaction.month);
    byMonth.set(key, [...(byMonth.get(key) ?? []), transaction]);
  }

  // Réel des mois clos et actifs de N-1 et N : base du prévu des charges mensuelles.
  const actualByMonth = new Map<string, ApartmentLines>();
  for (const y of [year - 1, year]) {
    for (let month = 1; month <= 12; month++) {
      const period = { year: y, month };
      if (!isActiveIn(apartment.acquiredAt, period) || !isMonthClosed(period, now)) continue;
      actualByMonth.set(
        monthKey(y, month),
        actualLines(
          { apartment, schedule, year: y, month },
          byMonth.get(monthKey(y, month)) ?? [],
          null,
        ),
      );
    }
  }

  const results: MonthResult[] = [];
  let balance = input.openingBalanceCents;
  for (let month = 1; month <= 12; month++) {
    if (!isActiveIn(apartment.acquiredAt, { year, month })) continue;
    const result = computeMonth(
      { apartment, schedule, year, month, openingBalanceCents: balance },
      {
        closed: isMonthClosed({ year, month }, now),
        basis: monthlyChargeBasis(actualByMonth, year, month),
        transactions: byMonth.get(monthKey(year, month)) ?? [],
        invoice: input.invoices.get(month) ?? null,
      },
    );
    results.push(result);
    balance = (result.actual ?? result.forecast).closingBalanceCents;
  }
  return results;
}

/**
 * Colonne d'une période = somme des colonnes de ses mois (vue année). Les soldes sont ceux du
 * premier et du dernier mois ; l'effort annuel est la **somme des efforts mensuels** : un mois
 * excédentaire ne compense pas un mois déficitaire (R5).
 */
function sumColumns(columns: readonly ApartmentColumn[]): ApartmentColumn {
  const lines: ApartmentLines = { ...ZERO_LINES };
  let differentialCents = 0;
  let effortCents = 0;
  for (const column of columns) {
    for (const key of Object.keys(lines) as (keyof ApartmentLines)[])
      lines[key] += column.lines[key];
    differentialCents += column.differentialCents;
    effortCents += column.effortCents;
  }
  return {
    lines,
    loanTotalCents: lines.loanCapital + lines.loanInterest + lines.loanInsurance,
    differentialCents,
    effortCents,
    openingBalanceCents: columns[0]?.openingBalanceCents ?? 0,
    closingBalanceCents: columns.at(-1)?.closingBalanceCents ?? 0,
  };
}

export interface ApartmentPeriodColumns {
  forecast: ApartmentColumn;
  /** `null` si la période ne contient aucun mois clos (vue mois d'un mois à venir). */
  actual: ApartmentColumn | null;
  /** Nombre de mois clos de la période. */
  closedMonths: number;
  /** Loyers dus (R8) : loyer prévu brut × mois clos. */
  rentDueCents: number;
  /** Mois clos d'un bien géré sans facture de gérance saisie (R12). */
  missingInvoiceMonths: number[];
}

/**
 * Prévu et réalisé d'une période. Le réalisé et le prévu portent sur les **mêmes mois clos** (l'écart
 * compare des périodes identiques) ; un mois non clos affiche seulement son prévu.
 */
export function periodColumns(
  apartment: ApartmentRecord,
  months: readonly MonthResult[],
): ApartmentPeriodColumns {
  const closed = months.filter((month) => month.closed);
  const forecastMonths = closed.length > 0 ? closed : months;
  return {
    forecast: sumColumns(forecastMonths.map((month) => month.forecast)),
    actual: closed.length > 0 ? sumColumns(closed.map((month) => month.actual!)) : null,
    closedMonths: closed.length,
    rentDueCents: apartment.rentCents * closed.length,
    missingInvoiceMonths: closed
      .filter((month) => month.missingManagementInvoice)
      .map((m) => m.month),
  };
}

/** Rendements bruts et nets en points de base (R9) : vue année seulement, sur le prix d'achat seul (H5). */
export function yieldsBps(
  apartment: ApartmentRecord,
  actual: ApartmentColumn | null,
  closedMonths: number,
): { grossBps: number; netBps: number } | null {
  if (!actual || closedMonths === 0 || apartment.priceCents <= 0) return null;
  const { lines } = actual;
  const chargesExcludingCredit =
    lines.managementFees +
    lines.extraManagementFees +
    lines.regularization +
    lines.electricity +
    lines.homeInsurance +
    lines.internetBox +
    lines.condoFees +
    lines.bankFees +
    lines.other +
    lines.propertyTax +
    lines.cfe;
  const annualize = (cents: number) => ((cents / closedMonths) * 12) / apartment.priceCents;
  return {
    grossBps: Math.round(annualize(lines.grossRent) * 10_000),
    netBps: Math.round(annualize(lines.grossRent - chargesExcludingCredit) * 10_000),
  };
}

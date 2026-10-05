import { allocateRefunds } from "@server/lib/pro/allocate-refunds";
import {
  amount,
  applyBp,
  billingAmount,
  htFromTtc,
  mapAmount,
  subtractAmounts,
  sumAmounts,
} from "@server/lib/pro/amounts";
import { regimeOf } from "@server/lib/pro/regimes";
import type {
  Amount,
  BillingInput,
  ChargeRow,
  ClientBilling,
  MixedCostRow,
  ProMonth,
  ProMonthInput,
} from "@server/lib/pro/types";
import {
  COLLECTED_VAT_BP,
  EMPLOYER_CONTRIBUTION_SPLIT_BP,
  MIXED_COSTS,
  mixedShareBp,
  PRO_CHARGE_CATEGORIES,
  PRO_CHARGE_VAT_BP,
} from "@shared/pro-rules";

/** Tolérance du statut « Encaissée » : un écart d'arrondi (< 1 €) ne laisse pas une facture en attente. */
const PAID_TOLERANCE_CENTS = 100;

/**
 * Calcul d'un mois du dashboard Pro : prévisionnel et réel côte à côte. Fonction **pure** (aucun
 * accès base) : toutes les données arrivent dans `input` (voir `load-year.ts`), ce qui la rend
 * testable et réutilisable (vue année = 12 appels).
 */
export function computeMonth(input: ProMonthInput): ProMonth {
  const { hasActual, settings } = input;
  const actualOrNull = (cents: number) => (hasActual ? cents : null);

  // ── Facturation (CA HT) ────────────────────────────────────────────────────────────────────
  const clients = billingByClient(input);
  const revenue = amount(
    sum(clients.map((client) => client.forecast.amountCents)),
    actualOrNull(sum(clients.map((client) => client.actual?.amountCents ?? 0))),
  );

  // ── Charges pro (HT) ───────────────────────────────────────────────────────────────────────
  const rows: ChargeRow[] = PRO_CHARGE_CATEGORIES.map((category) => {
    const vatBp = PRO_CHARGE_VAT_BP[category];
    const lastYearHt = htFromTtc(input.lastYearProDebits[category] ?? 0, vatBp);
    return {
      category,
      vatBp,
      amount: amount(
        input.forecasts[category] ?? lastYearHt,
        actualOrNull(htFromTtc(input.proDebits[category] ?? 0, vatBp)),
      ),
    };
  });

  // ── Frais mixtes (dépenses perso remboursées par la société) ───────────────────────────────
  const mixedCosts = mixedCostRows(input);
  const mixedCharge = amount(
    sum(mixedCosts.map((row) => row.due.forecast)),
    actualOrNull(input.proDebits.MIXED_COSTS_REFUND ?? 0),
  );
  const chargesTotal = sumAmounts([...rows.map((row) => row.amount), mixedCharge]);

  // ── Rémunération ───────────────────────────────────────────────────────────────────────────
  const regime = regimeOf(settings.regime);
  const pay = regime.remuneration(settings);
  const fixed = (cents: number) => amount(cents, actualOrNull(cents));
  const employerContributions = fixed(pay.employerContributionsCents);
  const remuneration = {
    bncWithdrawal: amount(
      input.forecasts.BNC_WITHDRAWAL ?? input.lastYearProDebits.BNC_WITHDRAWAL ?? 0,
      actualOrNull(input.proDebits.BNC_WITHDRAWAL ?? 0),
    ),
    grossSalary: fixed(pay.grossSalaryCents),
    employerContributions,
    employerContributionSplit: Object.entries(EMPLOYER_CONTRIBUTION_SPLIT_BP).map(
      ([category, bp]) => ({
        category,
        amount: mapAmount(employerContributions, (c) => applyBp(c, bp)),
      }),
    ),
    employeeContributions: fixed(pay.employeeContributionsCents),
    netSalary: fixed(pay.grossSalaryCents - pay.employeeContributionsCents),
    withholdingTax: fixed(pay.withholdingTaxCents),
  };

  // ── TVA ────────────────────────────────────────────────────────────────────────────────────
  const collected = mapAmount(revenue, (cents) => applyBp(cents, COLLECTED_VAT_BP));
  const deductible = amount(
    sum(rows.map((row) => applyBp(row.amount.forecast, row.vatBp))),
    actualOrNull(
      sum(rows.map((row) => (input.proDebits[row.category] ?? 0) - (row.amount.actual ?? 0))),
    ),
  );
  const vat = {
    collected,
    deductible,
    due: subtractAmounts(collected, deductible),
    payment: amount(
      Math.max(0, input.previousVatDueCents),
      actualOrNull(input.proDebits.VAT_PAYMENT ?? 0),
    ),
  };

  // ── Bénéfice ───────────────────────────────────────────────────────────────────────────────
  const profit = subtractAmounts(
    revenue,
    sumAmounts([chargesTotal, remuneration.grossSalary, employerContributions]),
  );

  // ── Kilomètres ─────────────────────────────────────────────────────────────────────────────
  const forecastKm = input.mileage.forecastKm ?? input.mileage.lastYearTripsKm;
  const actualKm = hasActual ? input.mileage.tripsKm : null;
  const kmCents = (km: number) => Math.round((km * settings.mileageRateMilli) / 10);

  return {
    year: input.year,
    month: input.month,
    hasActual,
    settings,
    revenue,
    billing: {
      clients,
      halfDays: sum(
        clients.map((client) =>
          hasActual ? (client.actual?.halfDays ?? 0) : client.forecast.halfDays,
        ),
      ),
      invoicedCents: revenue.actual ?? 0,
      collectedTtcCents: sum(clients.map((client) => client.paidCents)),
      remainingTtcCents: sum(
        clients.map((client) => Math.max(0, client.ttcCents - client.paidCents)),
      ),
    },
    charges: { rows, mixedCosts: mixedCharge, total: chargesTotal },
    remuneration,
    vat,
    profit,
    retained: subtractAmounts(profit, remuneration.bncWithdrawal),
    profitSocialCharges: mapAmount(profit, (cents) => regime.profitSocialCharges(cents, settings)),
    mixedCosts: {
      rows: mixedCosts,
      leftToRefundCents: hasActual
        ? sum(mixedCosts.map((row) => (row.due.actual ?? 0) - (row.paidCents ?? 0)))
        : sum(mixedCosts.map((row) => row.due.forecast)),
    },
    mileage: {
      forecastKm,
      actualKm,
      rateMilli: settings.mileageRateMilli,
      amount: amount(kmCents(forecastKm), actualKm === null ? null : kmCents(actualKm)),
    },
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Facturation regroupée par client (prévu et réel), avec le statut de la facture réelle. */
function billingByClient(input: ProMonthInput): ClientBilling[] {
  const names = new Map<string, string>();
  for (const line of [...input.forecastBilling, ...input.actualBilling]) {
    names.set(line.clientId, line.clientName);
  }
  const totals = (lines: readonly BillingInput[], clientId: string) => {
    const own = lines.filter((line) => line.clientId === clientId);
    return {
      halfDays: sum(own.map((line) => line.halfDays)),
      amountCents: sum(own.map(billingAmount)),
    };
  };

  return [...names].map(([clientId, clientName]) => {
    const forecast = totals(input.forecastBilling, clientId);
    const actual = input.hasActual ? totals(input.actualBilling, clientId) : null;
    const ttcCents = actual
      ? actual.amountCents + applyBp(actual.amountCents, COLLECTED_VAT_BP)
      : 0;
    const paidCents = input.paidByClient[clientId] ?? 0;
    const status = !actual
      ? "TO_INVOICE"
      : actual.amountCents === 0
        ? "NOT_INVOICED"
        : paidCents >= ttcCents - PAID_TOLERANCE_CENTS
          ? "PAID"
          : "PENDING";
    return { clientId, clientName, forecast, actual, status, ttcCents, paidCents };
  });
}

/** Frais mixtes ligne par ligne : dépense perso × quote-part, remboursements répartis dans l'ordre. */
function mixedCostRows(input: ProMonthInput): MixedCostRow[] {
  const { settings, hasActual } = input;
  const rows = MIXED_COSTS.map(({ category, key }) => {
    const shareBp = mixedShareBp(settings, key);
    const spent: Amount = amount(
      input.forecasts[category] ?? input.lastYearPersoDebits[category] ?? 0,
      hasActual ? (input.persoDebits[category] ?? 0) : null,
    );
    return {
      category,
      keyType: key,
      shareBp,
      spent,
      due: mapAmount(spent, (c) => applyBp(c, shareBp)),
    };
  });

  const paid = hasActual
    ? allocateRefunds(
        input.proDebits.MIXED_COSTS_REFUND ?? 0,
        rows.map((row) => row.due.actual ?? 0),
      )
    : null;
  return rows.map((row, index) => ({ ...row, paidCents: paid ? paid[index] : null }));
}

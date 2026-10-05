import { allocateRefunds } from "@server/lib/professional/allocate-refunds";
import {
  amount,
  applyBp,
  htFromTtc,
  mapAmount,
  subtractAmounts,
  sumAmounts,
} from "@server/lib/professional/amounts";
import { regimeOf } from "@server/lib/professional/regimes";
import { billingAmount } from "@shared/billing-days";
import type {
  ForecastActual,
  BillingInput,
  ChargeRow,
  ClientBilling,
  MixedCostRow,
  ProfessionalMonth,
  ProfessionalMonthInput,
} from "@server/lib/professional/types";
import {
  COLLECTED_VAT_BP,
  EMPLOYER_CONTRIBUTION_SPLIT_BP,
  MIXED_COSTS,
  mixedShareBp,
  PROFESSIONAL_CHARGE_CATEGORIES,
  PROFESSIONAL_CHARGE_VAT_BP,
} from "@shared/professional-rules";

/**
 * Calcul d'un mois du dashboard Pro : prévisionnel et réel côte à côte. Fonction **pure** (aucun
 * accès base) : toutes les données arrivent dans `input` (voir `load-year.ts`), ce qui la rend
 * testable et réutilisable (vue année = 12 appels).
 */
export function computeMonth(input: ProfessionalMonthInput): ProfessionalMonth {
  const { hasActual, settings } = input;
  const actualOrNull = (cents: number) => (hasActual ? cents : null);

  // ── Facturation (CA HT) ────────────────────────────────────────────────────────────────────
  const clients = billingByClient(input);
  const revenue = amount(
    sum(clients.map((client) => client.forecast.amountCents)),
    actualOrNull(sum(clients.map((client) => client.actual?.amountCents ?? 0))),
  );

  // ── Charges pro (HT) ───────────────────────────────────────────────────────────────────────
  const rows: ChargeRow[] = PROFESSIONAL_CHARGE_CATEGORIES.map((category) => {
    const vatBp = PROFESSIONAL_CHARGE_VAT_BP[category];
    const lastYearHt = htFromTtc(input.lastYearProfessionalDebits[category] ?? 0, vatBp);
    return {
      category,
      vatBp,
      amount: amount(
        input.forecasts[category] ?? lastYearHt,
        actualOrNull(htFromTtc(input.professionalDebits[category] ?? 0, vatBp)),
      ),
    };
  });

  // ── Frais mixtes (dépenses perso remboursées par la société) ───────────────────────────────
  const mixedCosts = mixedCostRows(input);
  const mixedCharge = amount(
    sum(mixedCosts.map((row) => row.due.forecast)),
    actualOrNull(input.professionalDebits.MIXED_COSTS_REFUND ?? 0),
  );
  const chargesTotal = sumAmounts([...rows.map((row) => row.amount), mixedCharge]);

  // ── Rémunération ───────────────────────────────────────────────────────────────────────────
  const regime = regimeOf(settings.regime);
  const pay = regime.remuneration(settings);
  const fixed = (cents: number) => amount(cents, actualOrNull(cents));
  const employerContributions = fixed(pay.employerContributionsCents);
  const remuneration = {
    bncWithdrawal: amount(
      input.forecasts.BNC_WITHDRAWAL ?? input.lastYearProfessionalDebits.BNC_WITHDRAWAL ?? 0,
      actualOrNull(input.professionalDebits.BNC_WITHDRAWAL ?? 0),
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
      sum(
        rows.map((row) => (input.professionalDebits[row.category] ?? 0) - (row.amount.actual ?? 0)),
      ),
    ),
  );
  const vat = {
    collected,
    deductible,
    due: subtractAmounts(collected, deductible),
    payment: amount(
      Math.max(0, input.previousVatDueCents),
      actualOrNull(input.professionalDebits.VAT_PAYMENT ?? 0),
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
      days: sum(
        clients.map((client) => (hasActual ? (client.actual?.days ?? 0) : client.forecast.days)),
      ),
      invoicedCents: revenue.actual ?? 0,
      invoicedTtcCents: sum(clients.map((client) => client.ttcCents)),
      collectedTtcCents: hasActual ? input.collections.receivedCents : 0,
      // Solde cumulé : ce qui restait dû + facturé du mois − encaissé du mois (jamais négatif).
      receivablesCents: hasActual
        ? Math.max(
            0,
            input.openingReceivablesCents +
              sum(clients.map((client) => client.ttcCents)) -
              input.collections.countedCents,
          )
        : null,
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

/** Facturation regroupée par nom de client (prévu et réel), TTC du réel (ou du prévu à venir). */
function billingByClient(input: ProfessionalMonthInput): ClientBilling[] {
  const names = [
    ...new Set([...input.forecastBilling, ...input.actualBilling].map((line) => line.clientName)),
  ];
  const totals = (lines: readonly BillingInput[], clientName: string) => {
    const own = lines.filter((line) => line.clientName === clientName);
    return {
      days: sum(own.map((line) => line.days)),
      amountCents: sum(own.map(billingAmount)),
    };
  };
  const ttc = (ht: number) => ht + applyBp(ht, COLLECTED_VAT_BP);

  return names.map((clientName) => {
    const forecast = totals(input.forecastBilling, clientName);
    const actual = input.hasActual ? totals(input.actualBilling, clientName) : null;
    return {
      clientName,
      forecast,
      actual,
      ttcCents: ttc((actual ?? forecast).amountCents),
    };
  });
}

/** Frais mixtes ligne par ligne : dépense perso × quote-part, remboursements répartis dans l'ordre. */
function mixedCostRows(input: ProfessionalMonthInput): MixedCostRow[] {
  const { settings, hasActual } = input;
  const rows = MIXED_COSTS.map(({ category, key }) => {
    const shareBp = mixedShareBp(settings, key);
    const spent: ForecastActual = amount(
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
        input.professionalDebits.MIXED_COSTS_REFUND ?? 0,
        rows.map((row) => row.due.actual ?? 0),
      )
    : null;
  return rows.map((row, index) => ({ ...row, paidCents: paid ? paid[index] : null }));
}

import type { TransactionCategory } from "@server/generated/prisma/enums";
import { validatedTransactions } from "@server/lib/dashboard/scope";
import type { db as Db } from "@server/lib/db";
import { applyBp } from "@server/lib/pro/amounts";
import { billingAmount } from "@shared/billing-days";
import { computeMonth } from "@server/lib/pro/compute-month";
import { computeYear } from "@server/lib/pro/compute-year";
import type { BillingInput, CategoryCents, ProMonth, ProMonthInput } from "@server/lib/pro/types";
import { resolveProYearSettings } from "@server/lib/settings/pro-year-settings";
import { COLLECTED_VAT_BP, MIXED_COSTS } from "@shared/pro-rules";
import type { ProYearSettingsValues } from "@shared/pro-rules";

const MIXED_CATEGORIES = MIXED_COSTS.map((cost) => cost.category);

const monthIndex = (year: number, month: number) => year * 12 + (month - 1);

/** Un mois a un réel s'il est commencé ou passé. */
export function hasActual(year: number, month: number, today: Date): boolean {
  return monthIndex(year, month) <= monthIndex(today.getUTCFullYear(), today.getUTCMonth() + 1);
}

/** Somme par (année, mois) puis par catégorie. */
type MonthCategoryCents = Map<number, CategoryCents>;

function addTo(
  map: MonthCategoryCents,
  year: number,
  month: number,
  category: TransactionCategory | null,
  cents: number,
) {
  if (!category) return;
  const key = monthIndex(year, month);
  const byCategory = map.get(key) ?? {};
  byCategory[category] = (byCategory[category] ?? 0) + cents;
  map.set(key, byCategory);
}

/**
 * Charge tout ce qu'il faut pour calculer une année du dashboard Pro (et décembre de l'année
 * précédente pour la TVA payée en janvier), puis appelle le calcul pur `computeYear`.
 * Quelques requêtes groupées : l'année entière reste petite (quelques centaines de lignes).
 */
export async function loadProYear(
  db: typeof Db,
  userId: string,
  year: number,
  today = new Date(),
): Promise<ProMonth[]> {
  const previousYear = year - 1;
  const [settings, previousSettings] = await Promise.all([
    resolveProYearSettings(db, userId, year),
    resolveProYearSettings(db, userId, previousYear),
  ]);

  const years = { gte: previousYear, lte: year };
  const [
    proDebitRows,
    persoDebitRows,
    billingLines,
    earlierActualLines,
    collectionRows,
    forecasts,
    mileageForecasts,
    trips,
  ] = await Promise.all([
    db.transaction.groupBy({
      by: ["year", "month", "category"],
      where: {
        ...validatedTransactions(userId, "PROFESSIONAL"),
        year: years,
        amountCents: { lt: 0 },
      },
      _sum: { amountCents: true },
    }),
    db.transaction.groupBy({
      by: ["year", "month", "category"],
      where: {
        ...validatedTransactions(userId, "PERSONAL"),
        year: years,
        amountCents: { lt: 0 },
        category: { in: MIXED_CATEGORIES },
      },
      _sum: { amountCents: true },
    }),
    db.billingLine.findMany({
      where: { userId, year: years },
      select: {
        year: true,
        month: true,
        kind: true,
        clientName: true,
        dailyRateCents: true,
        days: true,
      },
      orderBy: { id: "asc" },
    }),
    // Facturation réelle des années précédentes : reste à encaisser au 1er janvier.
    db.billingLine.findMany({
      where: { userId, kind: "ACTUAL", year: { lt: year } },
      select: { year: true, month: true, dailyRateCents: true, days: true },
    }),
    // Encaissements clients (crédits du relevé pro), par mois, jusqu'à l'année affichée.
    db.transaction.groupBy({
      by: ["year", "month"],
      where: {
        ...validatedTransactions(userId, "PROFESSIONAL"),
        category: "CLIENT_PAYMENT",
        amountCents: { gt: 0 },
        year: { lte: year },
      },
      _sum: { amountCents: true },
    }),
    db.monthlyForecast.findMany({ where: { userId, year: years } }),
    db.mileageForecast.findMany({ where: { userId, year } }),
    db.trip.groupBy({ by: ["year", "month"], where: { userId, year: years }, _sum: { km: true } }),
  ]);

  const proDebits: MonthCategoryCents = new Map();
  for (const row of proDebitRows) {
    addTo(proDebits, row.year, row.month, row.category, -(row._sum.amountCents ?? 0));
  }
  const persoDebits: MonthCategoryCents = new Map();
  for (const row of persoDebitRows) {
    addTo(persoDebits, row.year, row.month, row.category, -(row._sum.amountCents ?? 0));
  }
  const monthlyForecasts: MonthCategoryCents = new Map();
  for (const row of forecasts)
    addTo(monthlyForecasts, row.year, row.month, row.category, row.amountCents);
  const tripsKm = new Map(trips.map((row) => [monthIndex(row.year, row.month), row._sum.km ?? 0]));
  const forecastKm = new Map(mileageForecasts.map((row) => [row.month, row.km]));

  const billing = (kind: "FORECAST" | "ACTUAL", y: number, month: number): BillingInput[] =>
    billingLines
      .filter((line) => line.kind === kind && line.year === y && line.month === month)
      .map((line) => ({
        clientName: line.clientName,
        dailyRateCents: line.dailyRateCents,
        days: line.days,
      }));

  // ── Reste à encaisser cumulé ─────────────────────────────────────────────────────────────────
  // Facturé TTC réel par mois, toutes années confondues (jusqu'à l'année affichée).
  const invoicedTtc = new Map<number, number>();
  const actualLines = [
    ...earlierActualLines,
    ...billingLines.filter((line) => line.kind === "ACTUAL" && line.year === year),
  ];
  for (const line of actualLines) {
    const ht = billingAmount(line);
    const key = monthIndex(line.year, line.month);
    invoicedTtc.set(key, (invoicedTtc.get(key) ?? 0) + ht + applyBp(ht, COLLECTED_VAT_BP));
  }
  const received = new Map(
    collectionRows.map((row) => [monthIndex(row.year, row.month), row._sum.amountCents ?? 0]),
  );
  // Les virements reçus jusqu'au premier mois facturé dans l'app paient des factures plus
  // anciennes (absentes de l'app) : ils ne viennent pas en déduction du reste à encaisser.
  const invoicedMonths = [...invoicedTtc].filter(([, ttc]) => ttc > 0).map(([key]) => key);
  const firstInvoiced = invoicedMonths.length > 0 ? Math.min(...invoicedMonths) : null;
  const counted = (key: number) =>
    firstInvoiced !== null && key > firstInvoiced ? (received.get(key) ?? 0) : 0;
  let openingReceivables = 0;
  if (firstInvoiced !== null) {
    for (let key = firstInvoiced; key < monthIndex(year, 1); key++) {
      openingReceivables = Math.max(
        0,
        openingReceivables + (invoicedTtc.get(key) ?? 0) - counted(key),
      );
    }
  }

  const monthInput = (
    y: number,
    month: number,
    values: ProYearSettingsValues,
  ): Omit<ProMonthInput, "previousVatDueCents" | "openingReceivablesCents"> => ({
    year: y,
    month,
    hasActual: hasActual(y, month, today),
    settings: values,
    forecastBilling: billing("FORECAST", y, month),
    actualBilling: billing("ACTUAL", y, month),
    proDebits: proDebits.get(monthIndex(y, month)) ?? {},
    lastYearProDebits: proDebits.get(monthIndex(y - 1, month)) ?? {},
    persoDebits: persoDebits.get(monthIndex(y, month)) ?? {},
    lastYearPersoDebits: persoDebits.get(monthIndex(y - 1, month)) ?? {},
    forecasts: monthlyForecasts.get(monthIndex(y, month)) ?? {},
    collections: {
      receivedCents: received.get(monthIndex(y, month)) ?? 0,
      countedCents: counted(monthIndex(y, month)),
    },
    mileage: {
      tripsKm: tripsKm.get(monthIndex(y, month)) ?? 0,
      lastYearTripsKm: tripsKm.get(monthIndex(y - 1, month)) ?? 0,
      forecastKm: y === year ? (forecastKm.get(month) ?? null) : null,
    },
  });

  // TVA de décembre de l'année précédente : payée en janvier.
  const december = computeMonth({
    ...monthInput(previousYear, 12, previousSettings.values),
    previousVatDueCents: 0,
    openingReceivablesCents: 0,
  });
  const months = Array.from({ length: 12 }, (_, index) =>
    monthInput(year, index + 1, settings.values),
  );
  return computeYear(months, {
    previousVatDueCents: december.vat.due.actual ?? december.vat.due.forecast,
    receivablesCents: openingReceivables,
  });
}

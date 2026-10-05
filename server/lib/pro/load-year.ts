import type { TransactionCategory } from "@server/generated/prisma/enums";
import { validatedTransactions } from "@server/lib/dashboard/scope";
import type { db as Db } from "@server/lib/db";
import { applyBp, billingAmount } from "@server/lib/pro/amounts";
import { computeMonth } from "@server/lib/pro/compute-month";
import { computeYear } from "@server/lib/pro/compute-year";
import { invoiceKey, matchPayments } from "@server/lib/pro/match-payments";
import type { BillingInput, CategoryCents, ProMonth, ProMonthInput } from "@server/lib/pro/types";
import { resolveProYearSettings } from "@server/lib/settings/pro-year-settings";
import { COLLECTED_VAT_BP, MIXED_COSTS, PAYMENT_MATCH_WINDOW_MONTHS } from "@shared/pro-rules";
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
    clients,
    forecasts,
    mileageForecasts,
    trips,
    payments,
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
        clientId: true,
        dailyRateCents: true,
        halfDays: true,
        client: { select: { name: true } },
      },
      orderBy: { id: "asc" },
    }),
    db.client.findMany({
      where: { userId },
      select: { id: true, name: true, bankLabelKeyword: true },
    }),
    db.monthlyForecast.findMany({ where: { userId, year: years } }),
    db.mileageForecast.findMany({ where: { userId, year } }),
    db.trip.groupBy({ by: ["year", "month"], where: { userId, year: years }, _sum: { km: true } }),
    db.transaction.findMany({
      where: {
        ...validatedTransactions(userId, "PROFESSIONAL"),
        category: "CLIENT_PAYMENT",
        amountCents: { gt: 0 },
        date: {
          gte: new Date(Date.UTC(previousYear, 0, 1)),
          lt: new Date(Date.UTC(year + 1, PAYMENT_MATCH_WINDOW_MONTHS, 1)),
        },
      },
      select: { date: true, label: true, amountCents: true },
    }),
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
        clientId: line.clientId,
        clientName: line.client.name,
        dailyRateCents: line.dailyRateCents,
        halfDays: line.halfDays,
      }));

  // Rapprochement factures ↔ encaissements sur les deux années (les virements de janvier peuvent
  // payer les factures de décembre).
  const invoices = billingLines
    .filter((line) => line.kind === "ACTUAL")
    .map((line) => {
      const ht = billingAmount(line);
      return {
        clientId: line.clientId,
        year: line.year,
        month: line.month,
        ttcCents: ht + applyBp(ht, COLLECTED_VAT_BP),
      };
    });
  const paid = matchPayments(
    invoices,
    clients.map((client) => ({
      clientId: client.id,
      keyword: client.bankLabelKeyword || client.name,
    })),
    payments,
  );

  const monthInput = (
    y: number,
    month: number,
    values: ProYearSettingsValues,
  ): Omit<ProMonthInput, "previousVatDueCents"> => ({
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
    paidByClient: Object.fromEntries(
      clients.map((client) => [
        client.id,
        paid.get(invoiceKey({ clientId: client.id, year: y, month })) ?? 0,
      ]),
    ),
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
  });
  const months = Array.from({ length: 12 }, (_, index) =>
    monthInput(year, index + 1, settings.values),
  );
  return computeYear(months, december.vat.due.actual ?? december.vat.due.forecast);
}

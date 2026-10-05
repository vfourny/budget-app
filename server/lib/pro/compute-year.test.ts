import { describe, expect, it } from "vitest";

import { computeYear } from "@server/lib/pro/compute-year";
import type { ProMonthInput } from "@server/lib/pro/types";
import { DEFAULT_PRO_YEAR_SETTINGS } from "@shared/pro-rules";

type MonthInput = Omit<ProMonthInput, "previousVatDueCents" | "openingReceivablesCents">;

/** Mois minimal : 20 j × 450 € facturés, `received` encaissé. */
function month(index: number, received: number, hasActual = true): MonthInput {
  return {
    year: 2026,
    month: index,
    hasActual,
    settings: { ...DEFAULT_PRO_YEAR_SETTINGS },
    forecastBilling: [{ clientName: "Nexity", dailyRateCents: 45_000, days: 20 }],
    actualBilling: [{ clientName: "Nexity", dailyRateCents: 45_000, days: 20 }],
    proDebits: {},
    lastYearProDebits: {},
    persoDebits: {},
    lastYearPersoDebits: {},
    forecasts: {},
    collections: { receivedCents: received, countedCents: received },
    mileage: { tripsKm: 0, lastYearTripsKm: 0, forecastKm: null },
  };
}

describe("computeYear", () => {
  it("carries receivables from month to month (payment two months later)", () => {
    const months = computeYear(
      [month(1, 0), month(2, 0), month(3, 1_080_000), month(4, 1_080_000, false)],
      { previousVatDueCents: 0, receivablesCents: 200_000 },
    );
    expect(months.map((m) => m.billing.receivablesCents)).toEqual([
      1_280_000, // 2 000 € dus au 1er janvier + facture de janvier
      2_360_000,
      2_360_000, // facture de mars − paiement de janvier
      null, // mois à venir
    ]);
  });

  it("pays in a month the VAT due of the previous month", () => {
    const months = computeYear([month(1, 0), month(2, 0)], {
      previousVatDueCents: 50_000,
      receivablesCents: 0,
    });
    expect(months[0].vat.payment.forecast).toBe(50_000);
    expect(months[1].vat.payment.forecast).toBe(months[0].vat.due.actual);
  });
});

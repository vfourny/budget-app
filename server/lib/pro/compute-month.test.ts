import { describe, expect, it } from "vitest";

import { computeMonth } from "@server/lib/pro/compute-month";
import type { ProMonthInput } from "@server/lib/pro/types";
import { DEFAULT_PRO_YEAR_SETTINGS } from "@shared/pro-rules";

/** Septembre 2026 type : 20 j × 450 € chez Nexity, quelques charges, frais mixtes. */
function input(overrides: Partial<ProMonthInput> = {}): ProMonthInput {
  return {
    year: 2026,
    month: 9,
    hasActual: true,
    settings: { ...DEFAULT_PRO_YEAR_SETTINGS },
    forecastBilling: [{ clientName: "Nexity", dailyRateCents: 45_000, halfDays: 42 }],
    actualBilling: [{ clientName: "Nexity", dailyRateCents: 45_000, halfDays: 40 }],
    proDebits: {
      PRO_ACCOUNTANT: 21_600, // 180 € HT + 36 € TVA
      PRO_INSURANCE: 1_967,
      PRO_MEALS: 2_200, // 20 € HT + 2 € TVA
      BNC_WITHDRAWAL: 360_000,
      MIXED_COSTS_REFUND: 30_000,
      VAT_PAYMENT: 150_000,
      URSSAF: 39_000, // affiché mais hors charges (cotisations calculées depuis les Réglages)
    },
    lastYearProDebits: { PRO_ACCOUNTANT: 21_600, BNC_WITHDRAWAL: 300_000 },
    persoDebits: { RENT: 90_000, INTERNET: 5_000, TELECOM: 4_500, ENERGY: 13_000 },
    lastYearPersoDebits: { RENT: 88_000, INTERNET: 5_000, TELECOM: 4_500, ENERGY: 9_200 },
    forecasts: { PRO_MEALS: 3_000 },
    // 8 640 € reçus ce mois (facture de juillet), 1 000 € encore dus à l'ouverture du mois.
    collections: { receivedCents: 864_000, countedCents: 864_000 },
    openingReceivablesCents: 100_000,
    previousVatDueCents: 140_000,
    mileage: { tripsKm: 100, lastYearTripsKm: 108, forecastKm: null },
    ...overrides,
  };
}

describe("computeMonth", () => {
  it("computes revenue from half days × daily rate", () => {
    const month = computeMonth(input());
    expect(month.revenue).toEqual({ forecast: 945_000, actual: 900_000 });
    expect(month.billing.clients[0]).toMatchObject({ clientName: "Nexity", ttcCents: 1_080_000 });
    expect(month.billing.halfDays).toBe(40);
  });

  it("converts charges to HT and defaults the forecast to last year's actual", () => {
    const month = computeMonth(input());
    const accountant = month.charges.rows.find((row) => row.category === "PRO_ACCOUNTANT");
    expect(accountant?.amount).toEqual({ forecast: 18_000, actual: 18_000 });
    const meals = month.charges.rows.find((row) => row.category === "PRO_MEALS");
    expect(meals?.amount).toEqual({ forecast: 3_000, actual: 2_000 });
    // Déductible réel : 36 € (comptable) + 2 € (repas).
    expect(month.vat.deductible.actual).toBe(3_800);
    expect(month.vat.collected.actual).toBe(180_000);
    expect(month.vat.due.actual).toBe(176_200);
    expect(month.vat.payment).toEqual({ forecast: 140_000, actual: 150_000 });
  });

  it("computes salary, contributions and profit with the SAS IR rules", () => {
    const month = computeMonth(input());
    expect(month.remuneration.grossSalary.actual).toBe(80_000);
    expect(month.remuneration.employerContributions.actual).toBe(35_680);
    expect(month.remuneration.employeeContributions.actual).toBe(17_280);
    expect(month.remuneration.netSalary.actual).toBe(62_720);
    // PAS : 800 × 87,3 % = 698,40 € imposable × 17,4 % = 121,52 €.
    expect(month.remuneration.withholdingTax.actual).toBe(12_152);
    const split = month.remuneration.employerContributionSplit;
    expect(split.reduce((total, row) => total + (row.amount.actual ?? 0), 0)).toBeCloseTo(
      35_680,
      -1,
    );

    const charges = month.charges.total.actual ?? 0;
    expect(charges).toBe(18_000 + 1_967 + 2_000 + 30_000);
    expect(month.profit.actual).toBe(900_000 - charges - 80_000 - 35_680);
    expect(month.retained.actual).toBe((month.profit.actual ?? 0) - 360_000);
    expect(month.profitSocialCharges.actual).toBe(
      Math.round(((month.profit.actual ?? 0) * 970) / 10_000),
    );
    expect(month.remuneration.bncWithdrawal.forecast).toBe(300_000);
  });

  it("splits mixed costs with the area and n/d keys and allocates refunds in order", () => {
    const month = computeMonth(input());
    const [rent, internet, telecom, energy] = month.mixedCosts.rows;
    expect(rent.shareBp).toBe(2222); // 12 m² / 54 m²
    expect(rent.due.actual).toBe(19_998);
    expect(internet.shareBp).toBe(7143); // 5/7
    expect(internet.due.actual).toBe(3_572);
    expect(rent.paidCents).toBe(19_998);
    expect(internet.paidCents).toBe(3_572);
    expect(telecom.paidCents).toBe(3_214);
    expect(energy.paidCents).toBe(30_000 - 19_998 - 3_572 - 3_214);
    expect(rent.due.forecast).toBe(19_554);
  });

  it("has no actual values for a future month", () => {
    const month = computeMonth(input({ month: 11, hasActual: false }));
    expect(month.revenue.actual).toBeNull();
    expect(month.profit.actual).toBeNull();
    expect(month.billing.receivablesCents).toBeNull();
    expect(month.billing.collectedTtcCents).toBe(0);
    // TTC prévu : 21 j × 450 € × 1,2.
    expect(month.billing.invoicedTtcCents).toBe(1_134_000);
    expect(month.billing.halfDays).toBe(42);
    expect(month.mileage).toMatchObject({ forecastKm: 108, actualKm: null });
    expect(month.mixedCosts.leftToRefundCents).toBe(
      month.mixedCosts.rows.reduce((total, row) => total + row.due.forecast, 0),
    );
  });

  it("tracks collections and cumulative receivables (clients pay later)", () => {
    const month = computeMonth(input());
    expect(month.billing.collectedTtcCents).toBe(864_000);
    // 1 000 € dus + 10 800 € facturés − 8 640 € reçus.
    expect(month.billing.receivablesCents).toBe(316_000);
    // Un virement qui paie des factures absentes de l'app ne crée pas de solde négatif.
    const early = computeMonth(
      input({
        openingReceivablesCents: 0,
        collections: { receivedCents: 3_402_000, countedCents: 3_402_000 },
      }),
    );
    expect(early.billing.receivablesCents).toBe(0);
    // Reçu mais non déduit (avant le premier mois facturé dans l'app) : affiché, pas déduit.
    const uncounted = computeMonth(
      input({
        openingReceivablesCents: 0,
        collections: { receivedCents: 864_000, countedCents: 0 },
      }),
    );
    expect(uncounted.billing.collectedTtcCents).toBe(864_000);
    expect(uncounted.billing.receivablesCents).toBe(1_080_000);
  });

  it("computes mileage at the yearly rate", () => {
    const month = computeMonth(
      input({ mileage: { tripsKm: 100, lastYearTripsKm: 90, forecastKm: 120 } }),
    );
    expect(month.mileage.amount).toEqual({ forecast: 7_632, actual: 6_360 });
  });
});

import { computeMonth } from '@shared/professional/compute-month.util'
import { DEFAULT_PROFESSIONAL_YEAR_SETTINGS } from '@shared/professional/professional.rules'
import type { ProfessionalMonthInput } from '@shared/professional/professional.type'
import { describe, expect, it } from 'vitest'

/** Mois vide (réglages par défaut : 12 m² / 54 m², 636 m€ / km…), à compléter par cas. */
function input(
  overrides: Partial<ProfessionalMonthInput>,
): ProfessionalMonthInput {
  return {
    year: 2026,
    month: 3,
    hasActual: true,
    settings: DEFAULT_PROFESSIONAL_YEAR_SETTINGS,
    forecastBilling: [],
    actualBilling: [],
    collections: { receivedCents: 0, countedCents: 0 },
    forecasts: {},
    lastYearPersoDebits: {},
    lastYearProfessionalDebits: {},
    persoDebits: {},
    professionalDebits: {},
    mileage: { tripsKm: 0, lastYearTripsKm: 0, forecastKm: null },
    salary: { forecastCents: null, lastYearCents: 0 },
    openingReceivablesCents: 0,
    previousVatDueCents: 0,
    ...overrides,
  }
}

describe('computeMonth', () => {
  it('computes a started month: forecast and actual side by side', () => {
    const month = computeMonth(
      input({
        forecastBilling: [
          { clientName: 'Acme', dailyRateCents: 50_000, days: 10 },
          { clientName: 'Beta', dailyRateCents: 40_000, days: 1 },
        ],
        actualBilling: [
          { clientName: 'Acme', dailyRateCents: 50_000, days: 9.5 },
        ],
        collections: { receivedCents: 300_000, countedCents: 300_000 },
        openingReceivablesCents: 100_000,
        previousVatDueCents: 40_000,
        forecasts: { PROFESSIONAL_ACCOUNTANT: 10_000, INTERNET: 4200 },
        lastYearPersoDebits: { RENT_PAID: 90_000 },
        persoDebits: { RENT_PAID: 90_000, INTERNET: 4200 },
        professionalDebits: {
          PROFESSIONAL_ACCOUNTANT: 12_000,
          MIXED_COSTS_REFUND: 20_000,
          BNC_WITHDRAWAL: 200_000,
          VAT_PAYMENT: 50_000,
        },
        mileage: { tripsKm: 120, lastYearTripsKm: 100, forecastKm: null },
        salary: { forecastCents: 300_000, lastYearCents: 0 },
      }),
    )

    expect(month.revenue).toEqual({ forecast: 540_000, actual: 475_000 })
    expect(month.billing).toMatchObject({
      days: 9.5,
      invoicedTtcCents: 570_000,
      collectedTtcCents: 300_000,
      receivablesCents: 370_000, // 100 000 dû + 570 000 facturé − 300 000 encaissé
    })
    // Loyer 2222 bp → 19 998 dû, internet 5/7 → 3 000 dû ; 20 000 remboursés, dans l'ordre.
    expect(month.mixedCosts.rows.map((row) => row.paidCents)).toEqual([
      19_998, 2, 0, 0,
    ])
    expect(month.mixedCosts.leftToRefundCents).toBe(2998)
    expect(month.vat).toMatchObject({
      deductible: { forecast: 2000, actual: 2000 },
      due: { forecast: 106_000, actual: 93_000 },
      payment: { forecast: 40_000, actual: 50_000 },
    })
    // 475 000 − (10 000 + 20 000 de charges + 300 000 brut + 133 800 patronales)
    expect(month.profit.actual).toBe(11_200)
    expect(month.retained.actual).toBe(11_200 - 200_000)
    expect(month.mileage.amount).toEqual({ forecast: 6360, actual: 7632 })
  })

  it('computes a future month from forecasts and last year only', () => {
    const month = computeMonth(
      input({
        hasActual: false,
        forecastBilling: [
          { clientName: 'Acme', dailyRateCents: 50_000, days: 2 },
        ],
        lastYearProfessionalDebits: { BNC_WITHDRAWAL: 100_000 },
        mileage: { tripsKm: 0, lastYearTripsKm: 0, forecastKm: 50 },
        salary: { forecastCents: null, lastYearCents: 200_000 },
      }),
    )

    expect(month.revenue).toEqual({ forecast: 100_000, actual: null })
    expect(month.billing).toMatchObject({
      days: 2,
      invoicedTtcCents: 120_000,
      collectedTtcCents: 0,
      receivablesCents: null,
    })
    expect(month.remuneration.grossSalary.forecast).toBe(200_000)
    expect(month.remuneration.bncWithdrawal).toEqual({
      forecast: 100_000,
      actual: null,
    })
    expect(month.mixedCosts.rows.every((row) => row.paidCents === null)).toBe(
      true,
    )
    expect(month.mileage.actualKm).toBeNull()
  })
})

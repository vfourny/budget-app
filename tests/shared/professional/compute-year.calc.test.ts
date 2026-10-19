import { computeYear } from '@shared/professional/compute-year.calc'
import { DEFAULT_PROFESSIONAL_YEAR_SETTINGS } from '@shared/professional/professional.rules'
import { expect, it } from 'vitest'

const month = (value: number, hasActual: boolean) => ({
  year: 2026,
  month: value,
  hasActual,
  settings: DEFAULT_PROFESSIONAL_YEAR_SETTINGS,
  forecastBilling: [{ clientName: 'Acme', dailyRateCents: 50_000, days: 2 }],
  actualBilling: [{ clientName: 'Acme', dailyRateCents: 50_000, days: 2 }],
  collections: { receivedCents: 0, countedCents: 0 },
  forecasts: { BNC_WITHDRAWAL: 0 },
  lastYearPersoDebits: {},
  lastYearProfessionalDebits: {},
  persoDebits: {},
  professionalDebits: {},
  mileage: { tripsKm: 0, lastYearTripsKm: 0, forecastKm: null },
  salary: { forecastCents: 0, lastYearCents: 0 },
})

it('carries VAT due and receivables over to the next month', () => {
  const [january, february, march] = computeYear(
    [month(1, true), month(2, false), month(3, false)],
    { previousVatDueCents: 5000, receivablesCents: 10_000 },
  )

  expect(january?.vat.payment.forecast).toBe(5000)
  expect(january?.billing.receivablesCents).toBe(130_000) // 10 000 + 120 000 TTC
  // TVA du mois précédent : réelle si elle existe, sinon prévue.
  expect(february?.vat.payment.forecast).toBe(20_000)
  expect(march?.vat.payment.forecast).toBe(20_000)
  // Un mois à venir garde le reste à encaisser du dernier mois connu.
  expect(march?.billing.receivablesCents).toBeNull()
})

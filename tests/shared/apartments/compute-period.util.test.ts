import type {
  ApartmentRecord,
  ApartmentTransaction,
} from '@shared/apartments/apartment.type'
import {
  computeApartmentYear,
  periodColumns,
  yieldsBps,
} from '@shared/apartments/compute-period.util'
import { describe, expect, it } from 'vitest'

/**
 * Bien géré (7 %) acquis en décembre 2025, prêt de 12 000 € à 0 % sur 12 mois (100 000 c / mois,
 * de janvier à décembre 2026), assurance emprunteur 10 €. On est en mars 2026 : janvier et
 * février 2026 (et décembre 2025) sont clos.
 */
const managed: ApartmentRecord = {
  id: 'managed',
  name: 'Toulouse',
  kind: 'FURNISHED',
  acquiredAt: new Date(Date.UTC(2025, 11, 1)),
  managed: true,
  managementFeeBps: 700,
  priceCents: 10_000_000,
  creditInsuranceCents: 1000,
  loan: {
    principalCents: 1_200_000,
    rateBps: 0,
    termMonths: 12,
    firstDueDate: new Date(Date.UTC(2026, 0, 5)),
  },
}

let id = 0
const transaction = (
  year: number,
  month: number,
  category: ApartmentTransaction['category'],
  amountCents: number,
): ApartmentTransaction => ({
  id: String(++id),
  apartmentId: 'managed',
  date: new Date(Date.UTC(year, month - 1, 10)),
  label: '',
  year,
  month,
  category,
  amountCents,
})

const months = computeApartmentYear({
  apartment: managed,
  year: 2026,
  now: { year: 2026, month: 3 },
  openingBalanceCents: 10_000,
  forecasts: [
    { year: 2025, month: 12, line: 'grossRent', amountCents: 50_000 },
    { year: 2026, month: 1, line: 'electricity', amountCents: 4000 },
    { year: 2026, month: 10, line: 'propertyTax', amountCents: 80_000 },
  ],
  invoices: new Map([
    [
      1,
      { apartmentId: 'managed', month: 1, feesCents: 3500, extraFeesCents: 0 },
    ],
  ]),
  transactions: [
    transaction(2025, 12, 'ENERGY', -3000),
    transaction(2026, 1, 'APT_RENT_RECEIVED', 46_500),
    transaction(2026, 1, 'APT_LOAN_REPAYMENT', -100_000),
    transaction(2026, 1, 'APT_LOAN_INSURANCE', -1000),
    transaction(2026, 1, 'APT_OWNER_CONTRIBUTION', 20_000),
    transaction(2026, 1, null, -500),
    // Remboursement sur la ligne du prêt : pas une échéance, compté tel quel en capital.
    transaction(2026, 2, 'APT_LOAN_REPAYMENT', 100),
  ],
})
const [january, february] = months

describe('computeApartmentYear', () => {
  it('sums a closed month line by line (R2, R4, R7, R12)', () => {
    expect(january?.actual?.lines).toMatchObject({
      netRent: 46_500,
      managementFees: 3500,
      grossRent: 50_000,
      loanCapital: 100_000,
      loanInterest: 0,
      loanInsurance: 1000,
      ownerContribution: 20_000,
      other: 500,
    })
    expect(february?.actual?.lines.loanCapital).toBe(-100)
    expect(january?.missingManagementInvoice).toBe(false)
    expect(february?.missingManagementInvoice).toBe(true)
    // Le solde de février part de la fin de janvier (réalisé).
    expect(february?.forecast.openingBalanceCents).toBe(
      january?.actual?.closingBalanceCents,
    )
  })

  it('builds the forecast from inputs, carried values and history (R3)', () => {
    expect(january?.forecast.lines).toMatchObject({
      grossRent: 50_000, // reprise de la saisie de décembre 2025
      managementFees: 3500,
      netRent: 46_500,
      electricity: 4000, // saisie du mois
      loanCapital: 100_000,
      loanInsurance: 1000,
    })
    // Sans saisie ni N-1 : moyenne des autres mois clos (décembre 3 000, février 0).
    expect(february?.forecast.lines.electricity).toBe(1500)
    // N-1 du même mois : décembre 2025.
    expect(months.at(-1)?.forecast.lines.electricity).toBe(3000)
    expect(months[9]?.forecast.lines.propertyTax).toBe(80_000)
    expect(months.at(-1)?.forecastInputs.map((input) => input.line)).toContain(
      'cfe',
    )
    expect(months[2]?.actual).toBeNull()
  })

  it('starts at acquisition and has nothing to average before the first closed month', () => {
    const fresh = computeApartmentYear({
      apartment: {
        ...managed,
        id: 'fresh',
        managed: false,
        loan: null,
        acquiredAt: new Date(Date.UTC(2026, 2, 1)),
      },
      year: 2026,
      now: { year: 2026, month: 3 },
      openingBalanceCents: 0,
      forecasts: [],
      invoices: new Map(),
      transactions: [],
    })

    expect(fresh).toHaveLength(10) // mars → décembre
    expect(fresh[0]?.forecast.lines).toMatchObject({
      electricity: 0,
      managementFees: 0,
      loanInsurance: 0,
      loanCapital: 0,
    })
    expect(fresh[0]?.missingManagementInvoice).toBe(false)

    // Mois clos sans aucune transaction : réalisé à zéro.
    const quiet = computeApartmentYear({
      apartment: managed,
      year: 2026,
      now: { year: 2026, month: 2 },
      openingBalanceCents: 0,
      forecasts: [],
      invoices: new Map(),
      transactions: [],
    })
    expect(quiet[0]?.actual?.lines.netRent).toBe(0)
  })
})

describe('periodColumns', () => {
  it('compares forecast and actual on the same closed months', () => {
    const columns = periodColumns(months)

    expect(columns.closedMonths).toBe(2)
    expect(columns.missingInvoiceMonths).toEqual([2])
    expect(columns.rentDueCents).toBe(100_000)
    expect(columns.actual?.openingBalanceCents).toBe(10_000)
  })

  it('handles an empty period', () => {
    expect(periodColumns([])).toMatchObject({
      actual: null,
      closedMonths: 0,
      forecast: { openingBalanceCents: 0, closingBalanceCents: 0 },
    })
  })
})

describe('yieldsBps', () => {
  it('annualizes the closed months on the purchase price (R9)', () => {
    const { actual, closedMonths } = periodColumns(months)

    // 50 000 de loyer brut sur 2 mois → 300 000 / an sur 10 000 000 = 3 %.
    expect(yieldsBps(managed, actual, closedMonths)?.grossBps).toBe(300)
    expect(yieldsBps(managed, null, 0)).toBeNull()
    expect(yieldsBps(managed, actual, 0)).toBeNull()
    expect(yieldsBps({ ...managed, priceCents: 0 }, actual, 2)).toBeNull()
  })
})

import {
  averageDailyRate,
  billingAmount,
  roundToDayStep,
} from '@shared/professional/billing-days.util'
import { describe, expect, it } from 'vitest'

describe('roundToDayStep', () => {
  it.each([
    [1, 1],
    [1.3, 1.5],
    [1.2, 1],
    [0.25, 0.5],
    [0, 0],
  ])('arrondit %d à %d', (input, expected) => {
    expect(roundToDayStep(input)).toBe(expected)
  })
})

describe('billingAmount', () => {
  it('multiplie les jours par le TJM', () => {
    expect(billingAmount({ dailyRateCents: 60_000, days: 2.5 })).toBe(150_000)
  })

  it('arrondit au centime', () => {
    expect(billingAmount({ dailyRateCents: 33_333, days: 0.5 })).toBe(16_667)
  })
})

describe('averageDailyRate', () => {
  it('divise le montant par les jours', () => {
    expect(averageDailyRate(150_000, 2.5)).toBe(60_000)
  })

  it('renvoie 0 sans jour facturé', () => {
    expect(averageDailyRate(150_000, 0)).toBe(0)
  })
})

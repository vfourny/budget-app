import {
  averageDailyRate,
  billingAmount,
  roundToDayStep,
} from '@shared/professional/billing-days.util'
import { expect, it } from 'vitest'

it('roundToDayStep arrondit à la demi-journée', () => {
  expect(roundToDayStep(1.3)).toBe(1.5)
})

it('billingAmount = jours × TJM, arrondi au centime', () => {
  expect(billingAmount({ dailyRateCents: 33_333, days: 0.5 })).toBe(16_667)
})

it.each([
  [2.5, 60_000],
  [0, 0],
])('averageDailyRate sur %d jours = %d', (days, rate) => {
  expect(averageDailyRate(150_000, days)).toBe(rate)
})

import {
  hasMicroBicCeiling,
  microBicCeilingCents,
} from '@shared/fiscal/lmnp.rules'
import { expect, it } from 'vitest'

it('hasMicroBicCeiling', () => {
  expect(hasMicroBicCeiling(2026)).toBe(true)
  expect(hasMicroBicCeiling(2030)).toBe(false)
})

it.each([
  [2030, 8_360_000], // année inconnue : la dernière connue
  [2020, 7_770_000], // antérieure à toutes : la première
])('microBicCeilingCents(%d) = %d', (year, ceiling) => {
  expect(microBicCeilingCents(year)).toBe(ceiling)
})

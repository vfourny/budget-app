import {
  EMPLOYER_CONTRIBUTION_SPLIT_BP,
  mixedShareBp,
} from '@shared/professional/professional.rules'
import { expect, it } from 'vitest'

it('répartit 100 % des cotisations patronales', () => {
  const total = Object.values(EMPLOYER_CONTRIBUTION_SPLIT_BP).reduce(
    (sum, bp) => sum + bp,
    0,
  )

  expect(total).toBe(10_000)
})

it.each([
  ['area', 2222], // 12 m² de bureau / 54 m² de logement
  ['ratio', 7143], // 5/7
] as const)('mixedShareBp(%s) = %d', (allocation, shareBp) => {
  expect(
    mixedShareBp({ officeAreaDm2: 1200, homeAreaDm2: 5400 }, allocation),
  ).toBe(shareBp)
})

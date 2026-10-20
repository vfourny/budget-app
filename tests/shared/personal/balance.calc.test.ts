import { balanceAtEndOf } from '@shared/personal/balance.calc'
import { expect, it } from 'vitest'

const anchors = [
  { year: 2026, month: 1, balanceCents: 100_000 },
  { year: 2026, month: 3, balanceCents: 90_000 },
]
const nets = [
  { year: 2026, month: 2, cents: -5000 },
  { year: 2026, month: 3, cents: -2000 },
  { year: 2026, month: 4, cents: 1000 },
]

it('computes from the latest anchor and shows the drift on an anchored month', () => {
  expect(balanceAtEndOf({ year: 2026, month: 2 }, anchors, nets)).toEqual({
    year: 2026,
    month: 2,
    cents: 95_000,
    isAnchor: false,
    driftCents: null,
  })
  // Saisi 90 000, calculé 100 000 − 5 000 − 2 000 = 93 000.
  expect(balanceAtEndOf({ year: 2026, month: 3 }, anchors, nets)).toMatchObject(
    { cents: 90_000, isAnchor: true, driftCents: -3000 },
  )
  expect(
    balanceAtEndOf({ year: 2026, month: 1 }, anchors, nets).driftCents,
  ).toBeNull()
  expect(balanceAtEndOf({ year: 2025, month: 12 }, anchors, nets).cents).toBe(
    null,
  )
})

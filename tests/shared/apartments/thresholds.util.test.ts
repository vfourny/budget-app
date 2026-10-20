import type { ApartmentRecord } from '@shared/apartments/apartment.type'
import { periodColumns } from '@shared/apartments/compute-period.util'
import { computeThresholds } from '@shared/apartments/thresholds.util'
import { expect, it } from 'vitest'

const apartment = { kind: 'FURNISHED' } as ApartmentRecord
const empty = periodColumns([])

it('projects the gross rents of the closed months over a year (R10)', () => {
  const closed = {
    ...empty,
    closedMonths: 3,
    actual: {
      ...empty.forecast,
      lines: { ...empty.forecast.lines, grossRent: 150_000 },
    },
  }

  const thresholds = computeThresholds(2026, [
    { apartment, columns: closed },
    { apartment, columns: empty }, // aucun mois clos : ignoré
    { apartment, columns: { ...closed, closedMonths: 0 } },
  ])

  expect(thresholds).toMatchObject({
    receiptsCents: 150_000,
    projectedCents: 600_000,
    microBicCeilingCents: 8_360_000,
  })
})

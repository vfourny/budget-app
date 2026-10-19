import { yearMonthSchema } from '@shared/common/period.schema'
import { describe, expect, it } from 'vitest'

describe('period.schema', () => {
  it('accepts a real month and rejects month 13', () => {
    expect(yearMonthSchema.safeParse({ year: 2026, month: 12 }).success).toBe(
      true,
    )
    expect(yearMonthSchema.safeParse({ year: 2026, month: 13 }).success).toBe(
      false,
    )
  })
})

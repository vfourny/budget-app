import {
  compareMonths,
  currentYearMonth,
  followingMonthsOfYear,
  isBefore,
  isSameMonth,
  monthIndex,
  monthsBetween,
  nextMonth,
  previousMonth,
  utcDay,
  yearMonthOf,
} from '@shared/year-month.util'
import { describe, expect, it } from 'vitest'

describe('year-month.util', () => {
  it('orders months across years', () => {
    expect(monthIndex({ year: 2026, month: 1 })).toBe(
      monthIndex({ year: 2025, month: 12 }) + 1,
    )
    expect(isBefore({ year: 2025, month: 12 }, { year: 2026, month: 1 })).toBe(
      true,
    )
    expect(
      isSameMonth({ year: 2026, month: 3 }, { year: 2026, month: 3 }),
    ).toBe(true)
    expect(
      [
        { year: 2026, month: 2 },
        { year: 2025, month: 11 },
      ].sort(compareMonths),
    ).toEqual([
      { year: 2025, month: 11 },
      { year: 2026, month: 2 },
    ])
  })

  it('reads the month of a date in UTC', () => {
    const date = new Date('2026-01-31T23:30:00Z')
    expect(yearMonthOf(date)).toEqual({ year: 2026, month: 1 })
    expect(currentYearMonth(date)).toEqual({ year: 2026, month: 1 })
    expect(utcDay(date)).toEqual(new Date('2026-01-31T00:00:00Z'))
  })

  it('steps over year boundaries', () => {
    expect(previousMonth({ year: 2026, month: 1 })).toEqual({
      year: 2025,
      month: 12,
    })
    expect(previousMonth({ year: 2026, month: 5 })).toEqual({
      year: 2026,
      month: 4,
    })
    expect(nextMonth({ year: 2025, month: 12 })).toEqual({
      year: 2026,
      month: 1,
    })
    expect(
      monthsBetween({ year: 2025, month: 11 }, { year: 2026, month: 1 }),
    ).toEqual([
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
    ])
    expect(followingMonthsOfYear(10)).toEqual([11, 12])
  })
})

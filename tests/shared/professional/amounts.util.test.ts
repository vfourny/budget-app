import {
  finalOf,
  htFromTtc,
  mapAmount,
  subtractAmounts,
  sumAmounts,
  sumFinal,
} from '@shared/professional/amounts.util'
import { describe, expect, it } from 'vitest'

describe('amounts.util', () => {
  it('converts TTC to HT', () => {
    expect(htFromTtc(12_000, 2000)).toBe(10_000)
  })

  it('keeps the actual null as soon as one value has no actual', () => {
    const known = { forecast: 10, actual: 8 }
    const future = { forecast: 5, actual: null }
    expect(sumAmounts([known, future])).toEqual({ forecast: 15, actual: null })
    expect(subtractAmounts(known, future)).toEqual({
      forecast: 5,
      actual: null,
    })
    expect(mapAmount(future, (cents) => cents * 2)).toEqual({
      forecast: 10,
      actual: null,
    })
  })

  it('uses the actual when there is one, the forecast otherwise', () => {
    expect(finalOf({ forecast: 10, actual: 8 })).toBe(8)
    expect(
      sumFinal([
        { forecast: 10, actual: 8 },
        { forecast: 5, actual: null },
      ]),
    ).toBe(13)
  })
})

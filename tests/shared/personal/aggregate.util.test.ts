import { aggregatePeriod } from '@shared/personal/aggregate.util'
import { expect, it } from 'vitest'

it('splits credits into revenue lines and debits into envelopes', () => {
  const totals = aggregatePeriod([
    { category: 'SALARY_PAYMENT', amountCents: 300_000 },
    { category: null, amountCents: 1000 }, // crédit sans catégorie → « Autres »
    { category: 'GROCERIES', amountCents: -20_000 },
    { category: 'GROCERIES', amountCents: -5000 },
    { category: 'SHORT_TERM_SAVINGS', amountCents: -50_000 },
    { category: null, amountCents: -700 }, // débit sans enveloppe → dépense
  ])

  expect(totals.revenueCents).toBe(301_000)
  expect(totals.revenueLines.at(-1)).toEqual({ key: 'other', cents: 1000 })
  expect(totals.expenseCents).toBe(25_700)
  expect(totals.savingsCents).toBe(50_000)
  expect(totals.byEnvelope.CURRENT_EXPENSES).toBe(25_000)
  expect(totals.debitsByCategory[0]).toEqual({
    category: 'SHORT_TERM_SAVINGS',
    cents: 50_000,
  })
  expect(totals.fixedCharges.every((charge) => charge.cents === 0)).toBe(true)
})

it('has no « other » line when every credit has its line', () => {
  expect(
    aggregatePeriod([{ category: 'REFUND', amountCents: 100 }]).revenueLines,
  ).toHaveLength(4)
})

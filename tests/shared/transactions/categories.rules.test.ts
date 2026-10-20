import {
  categoriesOf,
  isCategoryOf,
  isToCheck,
  needsReview,
} from '@shared/transactions/categories.rules'
import { expect, it } from 'vitest'

it('isCategoryOf', () => {
  expect(isCategoryOf('APARTMENT', 'INTERNET')).toBe(true)
  expect(isCategoryOf('PROFESSIONAL', 'INTERNET')).toBe(false)
  expect(categoriesOf('APARTMENT')[0]).toBe('APT_RENT_RECEIVED')
})

it.each([
  [null, true],
  ['APT_OTHER', true],
  ['GROCERIES', false],
] as const)('isToCheck(%s) = %s', (category, toCheck) => {
  expect(isToCheck(category)).toBe(toCheck)
})

it.each([
  [{ category: null, categoryConfidence: null }, true],
  [{ category: 'GROCERIES', categoryConfidence: 0.5 }, true],
  [{ category: 'GROCERIES', categoryConfidence: 0.9 }, false],
  [{ category: 'GROCERIES', categoryConfidence: null }, false],
])('needsReview(%o) = %s', (transaction, expected) => {
  expect(needsReview(transaction)).toBe(expected)
})

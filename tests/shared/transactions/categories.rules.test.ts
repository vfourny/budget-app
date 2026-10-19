import { isCategoryOf, isToCheck } from '@shared/transactions/categories.rules'
import { expect, it } from 'vitest'

it('isCategoryOf', () => {
  expect(isCategoryOf('APARTMENT', 'INTERNET')).toBe(true)
  expect(isCategoryOf('PROFESSIONAL', 'INTERNET')).toBe(false)
})

it.each([
  [null, true],
  ['APT_OTHER', true],
  ['GROCERIES', false],
] as const)('isToCheck(%s) = %s', (category, toCheck) => {
  expect(isToCheck(category)).toBe(toCheck)
})

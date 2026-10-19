import {
  ENVELOPE_CATEGORIES,
  envelopeOf,
  isSavingsEnvelope,
} from '@shared/personal/personal.rules'
import { expect, it } from 'vitest'

it('range chaque catégorie dans une seule enveloppe', () => {
  const categories = Object.values(ENVELOPE_CATEGORIES).flat()

  expect(new Set(categories).size).toBe(categories.length)
})

it.each([
  ['GROCERIES', 'CURRENT_EXPENSES'],
  ['SALARY_PAYMENT', null],
  [null, null],
] as const)('envelopeOf(%s) = %s', (category, envelope) => {
  expect(envelopeOf(category)).toBe(envelope)
})

it('isSavingsEnvelope', () => {
  expect(isSavingsEnvelope('SAFETY_SAVINGS')).toBe(true)
  expect(isSavingsEnvelope('LEISURE')).toBe(false)
})

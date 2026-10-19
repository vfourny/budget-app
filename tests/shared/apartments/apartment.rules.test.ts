import { apartmentLineOf } from '@shared/apartments/apartment.rules'
import { expect, it } from 'vitest'

it.each([
  ['APT_RENT_RECEIVED', 'rentReceived'],
  ['FUEL', 'other'],
  [null, 'other'],
] as const)('apartmentLineOf(%s) = %s', (category, line) => {
  expect(apartmentLineOf(category)).toBe(line)
})

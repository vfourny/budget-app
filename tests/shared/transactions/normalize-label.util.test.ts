import {
  labelKey,
  normalizeLabel,
} from '@shared/transactions/normalize-label.util'
import { expect, it } from 'vitest'

it('retire la date d’opération et le numéro de carte', () => {
  expect(normalizeLabel('CARTE 03/04/26  Carrefour CB*0264')).toBe(
    'CARTE Carrefour',
  )
  expect(labelKey('carte 28/05/2026 carrefour cb*0264')).toBe(
    labelKey('CARTE 03/04/26 CARREFOUR CB*0264'),
  )
})

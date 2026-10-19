import {
  estimateIncomeTaxCents,
  incomeTaxBrackets,
} from '@shared/fiscal/income-tax.rules'
import { expect, it } from 'vitest'

it('applique le barème progressif tranche par tranche', () => {
  const brackets = incomeTaxBrackets(2026) ?? []

  // 30 000 € : 17 979 € à 11 % + 421 € à 30 %
  expect(estimateIncomeTaxCents(3_000_000, brackets)).toBe(210_399)
})

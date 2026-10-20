import { DEFAULT_PROFESSIONAL_YEAR_SETTINGS } from '@shared/professional/professional.rules'
import { regimeOf } from '@shared/professional/regimes'
import { sasIrRegime } from '@shared/professional/regimes/sas-ir.regime'
import { expect, it } from 'vitest'

it('falls back to SAS à l’IR for a regime not computed yet', () => {
  expect(regimeOf('EURL')).toBe(sasIrRegime)
})

it('charges no social contributions on a loss', () => {
  expect(
    sasIrRegime.profitSocialCharges(-1000, DEFAULT_PROFESSIONAL_YEAR_SETTINGS),
  ).toBe(0)
})

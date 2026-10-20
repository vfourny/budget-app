import { checkParsedStatement } from '@shared/transactions/statement-checks.calc'
import { expect, it } from 'vitest'

const at = (iso: string, label = 'X') => ({
  date: new Date(iso),
  label,
  amountCents: 100,
  month: 1,
  year: 2026,
})

it('relevé cohérent : aucun contrôle levé (date du jour par défaut)', () => {
  expect(
    checkParsedStatement({ transactions: [at('2026-01-05')], errors: [] }),
  ).toEqual([])
})

it('lève chaque anomalie', () => {
  const now = new Date('2026-10-20')
  expect(checkParsedStatement({ transactions: [], errors: [] }, now)).toEqual([
    'NO_TRANSACTIONS',
  ])
  expect(
    checkParsedStatement(
      {
        transactions: [at('1999-12-31'), at('2026-12-31', '')],
        errors: [{ line: 2, code: 'UNKNOWN', raw: '', value: '' }],
      },
      now,
    ),
  ).toEqual(['UNREADABLE_LINES', 'DATES_OUT_OF_RANGE', 'EMPTY_LABELS'])
})

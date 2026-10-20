import { removeAlreadyImported } from '@shared/transactions/dedupe.util'
import { expect, it } from 'vitest'

const line = (label: string, amountCents = -500) => ({
  date: new Date(Date.UTC(2026, 9, 1)),
  label,
  amountCents,
  month: 10,
  year: 2026,
})

it('écarte au plus autant d’occurrences qu’il en existe déjà (multi-ensemble)', () => {
  const parsed = [line('CAFE'), line('CAFE'), line('CAFE'), line('PAIN')]
  const existing = [line('CAFE'), line('CAFE'), line('PAIN', -600)]
  const { fresh, duplicateCount } = removeAlreadyImported(parsed, existing)
  expect(duplicateCount).toBe(2)
  expect(fresh.map((t) => t.label)).toEqual(['CAFE', 'PAIN'])
})

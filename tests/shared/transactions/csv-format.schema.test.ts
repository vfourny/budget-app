import { csvFormatConfigSchema } from '@shared/transactions/csv-format.schema'
import { expect, it } from 'vitest'

it('accepte un format débit / crédit', () => {
  const config = {
    delimiter: ';',
    hasHeader: true,
    dateFormat: 'dd/mm/yyyy',
    decimalSeparator: ',',
    dateColumn: 0,
    labelColumns: [1, 2],
    amount: { kind: 'debitCredit', debit: 3, credit: 4 },
  }

  expect(csvFormatConfigSchema.safeParse(config).success).toBe(true)
})

import type { CsvFormatConfig } from '@shared/transactions/csv-format.schema'
import {
  parseBankStatement,
  splitCsvLine,
} from '@shared/transactions/parse-bank-statement.calc'
import { describe, expect, it } from 'vitest'

/** Formats réels (`prisma/seeds/csv-formats.seed.ts`). */
const BOURSOBANK: CsvFormatConfig = {
  delimiter: ';',
  hasHeader: true,
  dateFormat: 'yyyy-mm-dd',
  decimalSeparator: ',',
  dateColumn: 0,
  labelColumns: [2],
  amount: { kind: 'signed', column: 6 },
}
const BANQUE_POPULAIRE: CsvFormatConfig = {
  delimiter: ';',
  hasHeader: true,
  dateFormat: 'dd/mm/yyyy',
  decimalSeparator: ',',
  dateColumn: 0,
  labelColumns: [1, 3],
  amount: { kind: 'debitCredit', debit: 5, credit: 6 },
}

describe('splitCsvLine', () => {
  it('garde un délimiteur et un guillemet échappé à l’intérieur d’un champ cité', () => {
    expect(splitCsvLine('a;"b;c";"d ""e""";', ';')).toEqual([
      'a',
      'b;c',
      'd "e"',
      '',
    ])
  })
})

describe('parseBankStatement', () => {
  it('BoursoBank : montant signé, milliers avec espace, champs cités', () => {
    const csv = [
      '"Date Opération";"Date Valeur";Libellé;…',
      '2026-09-28;2026-09-28;"CARTE 27/09/26 CARREFOUR CB*0264";;;;"-1 234,56";;;;"2 000,00";',
      '2026-09-30;2026-09-30;"VIR SALAIRE";;;;"+3500,00";;;;;',
      '',
    ].join('\r\n')
    const { transactions, errors } = parseBankStatement(csv, BOURSOBANK)
    expect(errors).toEqual([])
    expect(transactions).toEqual([
      {
        date: new Date(Date.UTC(2026, 8, 28)),
        label: 'CARTE 27/09/26 CARREFOUR CB*0264',
        amountCents: -123_456,
        month: 9,
        year: 2026,
      },
      expect.objectContaining({ amountCents: 350_000, label: 'VIR SALAIRE' }),
    ])
  })

  it('Banque Populaire : débit / crédit signés ou non, libellé composé', () => {
    const csv = [
      'Date comptable;Libelle simplifie;Reference;Informations complementaires;Type operation;Debit;Credit',
      '05/10/2026;PRLV URSSAF;R1;Cotisations T3;;-115,00;',
      '06/10/2026;VIR CLIENT;R2;;;;8640,00',
      '07/10/2026;FRAIS;R3;;;12,50;',
    ].join('\n')
    const { transactions } = parseBankStatement(csv, BANQUE_POPULAIRE)
    expect(
      transactions.map(({ label, amountCents }) => [label, amountCents]),
    ).toEqual([
      ['PRLV URSSAF — Cotisations T3', -11_500],
      ['VIR CLIENT', 864_000],
      ['FRAIS', -1250],
    ])
  })

  it('écarte les lignes illisibles sans bloquer les autres (numéro de ligne sans en-tête)', () => {
    const config: CsvFormatConfig = {
      ...BANQUE_POPULAIRE,
      hasHeader: false,
      decimalSeparator: '.',
      amount: { kind: 'signed', column: 5 },
    }
    const csv = [
      '01/10/2026;OK;;;;12.5',
      '32/13;DATE;;;;1',
      '02/10/2026;MONTANT;;;;abc',
      '03/10/2026;VIDE;;;;',
      '04/10/2026;COURT',
    ].join('\n')
    const { transactions, errors } = parseBankStatement(csv, config)
    expect(transactions.map((t) => t.amountCents)).toEqual([1250])
    expect(errors.map(({ line, code, value }) => [line, code, value])).toEqual([
      [2, 'INVALID_DATE', '32/13'],
      [3, 'INVALID_AMOUNT', 'abc'],
      [4, 'MISSING_AMOUNT', ''],
      [5, 'MISSING_AMOUNT', ''],
    ])
  })

  it('débit et crédit vides, colonnes absentes et erreur inattendue', () => {
    const csv = 'en-tête\n01/10/2026;SANS MONTANT'
    expect(parseBankStatement(csv, BANQUE_POPULAIRE).errors[0]?.code).toBe(
      'EMPTY_DEBIT_CREDIT',
    )
    expect(
      parseBankStatement(csv, { ...BANQUE_POPULAIRE, dateColumn: 9 }).errors[0],
    ).toMatchObject({ code: 'INVALID_DATE', value: '' })
    // Une erreur qui n'est pas une erreur de ligne connue est reportée en `UNKNOWN`.
    const broken = { ...BANQUE_POPULAIRE, labelColumns: null }
    expect(
      parseBankStatement(csv, broken as unknown as CsvFormatConfig).errors[0],
    ).toMatchObject({ line: 2, code: 'UNKNOWN', value: '' })
  })
})

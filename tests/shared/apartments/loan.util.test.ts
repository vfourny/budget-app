import type { LoanInstallment } from '@shared/apartments/loan.util'
import { loanSchedule, splitLoanPayment } from '@shared/apartments/loan.util'
import { describe, expect, it } from 'vitest'

describe('loanSchedule', () => {
  it('amortit le capital, la dernière échéance soldant le reste', () => {
    // 10 000 € à 12 %/an (1 %/mois) sur 2 mois : mensualité 5 075,12 €
    const schedule = loanSchedule({
      firstDueDate: new Date(Date.UTC(2026, 0, 15)),
      principalCents: 1_000_000,
      rateBps: 1200,
      termMonths: 2,
    })

    expect(schedule).toMatchObject([
      { interestCents: 10_000, capitalCents: 497_512, balanceCents: 502_488 },
      { interestCents: 5025, capitalCents: 502_488, balanceCents: 0 },
    ])
  })

  it('sans intérêts, ramène le jour à la fin du mois et passe l’année', () => {
    const schedule = loanSchedule({
      firstDueDate: new Date(Date.UTC(2025, 11, 31)),
      principalCents: 30_000,
      rateBps: 0,
      termMonths: 3,
    })

    expect(
      schedule.map(({ dueDate, paymentCents }) => [
        dueDate.toISOString().slice(0, 10),
        paymentCents,
      ]),
    ).toEqual([
      ['2025-12-31', 10_000],
      ['2026-01-31', 10_000],
      ['2026-02-28', 10_000],
    ])
  })
})

describe('splitLoanPayment', () => {
  const installment = {
    paymentCents: 50_000,
    interestCents: 10_000,
    capitalCents: 40_000,
  } as LoanInstallment

  it.each([
    [50_050, 0, { recognized: true, capitalCents: 40_000, insuranceCents: 0 }],
    [
      52_000,
      2000,
      { recognized: true, capitalCents: 40_000, insuranceCents: 2000 },
    ],
    [60_000, 0, { recognized: false, capitalCents: 50_000, insuranceCents: 0 }],
  ])('ventile %d (assurance %d)', (amount, insurance, expected) => {
    expect(splitLoanPayment(amount, installment, insurance)).toEqual({
      ...expected,
      interestCents: 10_000,
    })
  })
})

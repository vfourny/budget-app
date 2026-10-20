import type { Apartment } from '@server/generated/prisma/client'
import {
  loanSchedule,
  type LoanTerms,
  splitLoanPayment,
} from '@shared/apartments/loan.util'
import { isBefore, type YearMonth } from '@shared/common/year-month.util'

/** Champs d'un appartement utiles au prêt (un sous-ensemble du modèle Prisma). */
type LoanApartment = Pick<
  Apartment,
  | 'loanPrincipalCents'
  | 'loanRateBps'
  | 'loanTermMonths'
  | 'loanFirstDueDate'
  | 'creditInsuranceCents'
>

export interface LoanMatch {
  /** Mensualité attendue d'après le tableau d'amortissement (hors assurance). */
  expectedCents: number
  /** Montant prélevé reconnu comme l'échéance attendue du mois (R7) ? */
  recognized: boolean
}

/**
 * Compare une transaction `APT_LOAN_REPAYMENT` à l'échéance attendue de son mois (R7).
 * `null` si le bien n'a pas de prêt ou si le mois est hors du tableau d'amortissement.
 */
export function matchLoanTransaction(
  apartment: LoanApartment,
  transaction: { year: number; month: number; amountCents: number },
): LoanMatch | null {
  if (
    apartment.loanPrincipalCents === null ||
    apartment.loanRateBps === null ||
    apartment.loanTermMonths === null ||
    apartment.loanFirstDueDate === null
  ) {
    return null
  }
  const installment = loanSchedule({
    principalCents: apartment.loanPrincipalCents,
    rateBps: apartment.loanRateBps,
    termMonths: apartment.loanTermMonths,
    firstDueDate: apartment.loanFirstDueDate,
  }).find(
    (row) => row.year === transaction.year && row.month === transaction.month,
  )
  if (!installment) return null

  const split = splitLoanPayment(
    Math.abs(transaction.amountCents),
    installment,
    apartment.creditInsuranceCents,
  )
  return {
    recognized: split.recognized,
    expectedCents: installment.paymentCents,
  }
}

/**
 * Capital remboursé (jauge de la carte, R6) : somme des capitaux des échéances du tableau jusqu'au
 * mois `through` inclus, indépendamment des transactions. `null` pour un bien sans prêt.
 */
export function capitalRepaid(
  loan: LoanTerms | null,
  through: YearMonth,
): { repaidCents: number; principalCents: number } | null {
  if (!loan) return null
  const repaidCents = loanSchedule(loan)
    .filter((row) => !isBefore(through, row))
    .reduce((sum, row) => sum + row.capitalCents, 0)
  return { repaidCents, principalCents: loan.principalCents }
}

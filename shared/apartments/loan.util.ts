import type { Apartment } from '@server/generated/prisma/client'
import { LOAN_MATCH_TOLERANCE_CENTS } from '@shared/apartments/apartment.rules'
import { isBefore, type YearMonth } from '@shared/common/year-month.util'

/*
 * Prêt immobilier à taux fixe, sans palier ni différé (R6, hypothèse H3) et rapprochement d'une
 * échéance prélevée (R7). Fonctions pures partagées front + serveur : le résumé des Réglages et les
 * dashboards lisent le même tableau d'amortissement. Montants en centimes, taux en points de base.
 * L'assurance emprunteur est à part : elle n'entre ni dans la mensualité, ni dans le capital, ni
 * dans les intérêts.
 */

export interface LoanTerms {
  /** Date de la première échéance (UTC) ; les suivantes tombent le même jour du mois. */
  firstDueDate: Date
  principalCents: number
  /** Taux annuel en points de base (3,00 % = 300). */
  rateBps: number
  termMonths: number
}

export interface LoanInstallment {
  /** Capital restant dû après cette échéance. */
  balanceCents: number
  capitalCents: number
  dueDate: Date
  interestCents: number
  /** 1-12. */
  month: number
  paymentCents: number
  year: number
}

/** Date de l'échéance `index` (0 = la première), le jour est ramené à la fin du mois si besoin (31 → 28/30). */
function dueDateAt(first: Date, index: number): Date {
  const monthIndex = first.getUTCMonth() + index
  const year = first.getUTCFullYear() + Math.floor(monthIndex / 12)
  const month = monthIndex % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(first.getUTCDate(), lastDay)))
}

/** Mensualité hors assurance : `round(P × i / (1 − (1 + i)^−n))`, `i = taux / 12`. */
function monthlyPaymentCents({
  principalCents,
  rateBps,
  termMonths,
}: LoanTerms): number {
  const monthlyRate = rateBps / 10_000 / 12
  if (monthlyRate === 0) return Math.round(principalCents / termMonths)
  return Math.round(
    (principalCents * monthlyRate) / (1 - (1 + monthlyRate) ** -termMonths),
  )
}

/**
 * Tableau d'amortissement : une ligne par échéance. Les intérêts d'une échéance valent
 * `round(capital restant × i)` ; la dernière échéance solde le capital restant.
 */
export function loanSchedule(terms: LoanTerms): LoanInstallment[] {
  const { principalCents, rateBps, termMonths, firstDueDate } = terms
  const payment = monthlyPaymentCents(terms)
  const installments: LoanInstallment[] = []
  let balance = principalCents
  for (let index = 0; index < termMonths; index++) {
    const interestCents = Math.round((balance * rateBps) / 120_000)
    const isLast = index === termMonths - 1
    const capitalCents = isLast
      ? balance
      : Math.min(payment - interestCents, balance)
    balance -= capitalCents
    const dueDate = dueDateAt(firstDueDate, index)
    installments.push({
      dueDate,
      year: dueDate.getUTCFullYear(),
      month: dueDate.getUTCMonth() + 1,
      paymentCents: capitalCents + interestCents,
      interestCents,
      capitalCents,
      balanceCents: balance,
    })
  }
  return installments
}

export interface LoanPaymentSplit {
  capitalCents: number
  /** Assurance emprunteur comprise dans le prélèvement (0 si elle est prélevée à part). */
  insuranceCents: number
  interestCents: number
  /** Montant prélevé reconnu comme l'échéance attendue (R7) ? */
  recognized: boolean
}

/**
 * Ventile une transaction `APT_LOAN_REPAYMENT` d'après l'échéance attendue du mois (R7). Reconnue si
 * `|montant − mensualité|` ≤ 1 €, ou `|montant − (mensualité + assurance)|` ≤ 1 € : capital et
 * intérêts viennent alors du tableau. Sinon les intérêts restent ceux du tableau et le capital est
 * le montant réel moins les intérêts (le montant payé reste exact).
 *
 * @param amountCents Montant prélevé en valeur absolue.
 */
export function splitLoanPayment(
  amountCents: number,
  installment: LoanInstallment,
  insuranceCents: number,
): LoanPaymentSplit {
  const { paymentCents, interestCents, capitalCents } = installment
  const matchesPayment =
    Math.abs(amountCents - paymentCents) <= LOAN_MATCH_TOLERANCE_CENTS
  const matchesWithInsurance =
    insuranceCents > 0 &&
    Math.abs(amountCents - (paymentCents + insuranceCents)) <=
      LOAN_MATCH_TOLERANCE_CENTS
  if (matchesPayment)
    return { recognized: true, capitalCents, interestCents, insuranceCents: 0 }
  if (matchesWithInsurance)
    return { recognized: true, capitalCents, interestCents, insuranceCents }
  return {
    recognized: false,
    capitalCents: amountCents - interestCents,
    interestCents,
    insuranceCents: 0,
  }
}

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

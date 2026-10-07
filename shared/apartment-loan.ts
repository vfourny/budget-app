import { LOAN_MATCH_TOLERANCE_CENTS } from "@shared/apartment-rules";

/*
 * Prêt immobilier à taux fixe, sans palier ni différé (R6, hypothèse H3) et rapprochement d'une
 * échéance prélevée (R7). Fonctions pures partagées front + serveur : le résumé des Réglages et les
 * dashboards lisent le même tableau d'amortissement. Montants en centimes, taux en points de base.
 * L'assurance emprunteur est à part : elle n'entre ni dans la mensualité, ni dans le capital, ni
 * dans les intérêts.
 */

export interface LoanTerms {
  principalCents: number;
  /** Taux annuel en points de base (3,00 % = 300). */
  rateBps: number;
  termMonths: number;
  /** Date de la première échéance (UTC) ; les suivantes tombent le même jour du mois. */
  firstDueDate: Date;
}

export interface LoanInstallment {
  dueDate: Date;
  year: number;
  /** 1-12. */
  month: number;
  paymentCents: number;
  interestCents: number;
  capitalCents: number;
  /** Capital restant dû après cette échéance. */
  balanceCents: number;
}

/** Date de l'échéance `index` (0 = la première), le jour est ramené à la fin du mois si besoin (31 → 28/30). */
function dueDateAt(first: Date, index: number): Date {
  const monthIndex = first.getUTCMonth() + index;
  const year = first.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = monthIndex % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(first.getUTCDate(), lastDay)));
}

/** Mensualité hors assurance : `round(P × i / (1 − (1 + i)^−n))`, `i = taux / 12`. */
function monthlyPaymentCents({ principalCents, rateBps, termMonths }: LoanTerms): number {
  const monthlyRate = rateBps / 10_000 / 12;
  if (monthlyRate === 0) return Math.round(principalCents / termMonths);
  return Math.round((principalCents * monthlyRate) / (1 - (1 + monthlyRate) ** -termMonths));
}

/**
 * Tableau d'amortissement : une ligne par échéance. Les intérêts d'une échéance valent
 * `round(capital restant × i)` ; la dernière échéance solde le capital restant.
 */
export function loanSchedule(terms: LoanTerms): LoanInstallment[] {
  const { principalCents, rateBps, termMonths, firstDueDate } = terms;
  const payment = monthlyPaymentCents(terms);
  const installments: LoanInstallment[] = [];
  let balance = principalCents;
  for (let index = 0; index < termMonths; index++) {
    const interestCents = Math.round((balance * rateBps) / 120_000);
    const isLast = index === termMonths - 1;
    const capitalCents = isLast ? balance : Math.min(payment - interestCents, balance);
    balance -= capitalCents;
    const dueDate = dueDateAt(firstDueDate, index);
    installments.push({
      dueDate,
      year: dueDate.getUTCFullYear(),
      month: dueDate.getUTCMonth() + 1,
      paymentCents: capitalCents + interestCents,
      interestCents,
      capitalCents,
      balanceCents: balance,
    });
  }
  return installments;
}

export interface LoanPaymentSplit {
  /** Montant prélevé reconnu comme l'échéance attendue (R7) ? */
  recognized: boolean;
  capitalCents: number;
  interestCents: number;
  /** Assurance emprunteur comprise dans le prélèvement (0 si elle est prélevée à part). */
  insuranceCents: number;
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
  const { paymentCents, interestCents, capitalCents } = installment;
  const matchesPayment = Math.abs(amountCents - paymentCents) <= LOAN_MATCH_TOLERANCE_CENTS;
  const matchesWithInsurance =
    insuranceCents > 0 &&
    Math.abs(amountCents - (paymentCents + insuranceCents)) <= LOAN_MATCH_TOLERANCE_CENTS;
  if (matchesPayment) return { recognized: true, capitalCents, interestCents, insuranceCents: 0 };
  if (matchesWithInsurance)
    return { recognized: true, capitalCents, interestCents, insuranceCents };
  return {
    recognized: false,
    capitalCents: amountCents - interestCents,
    interestCents,
    insuranceCents: 0,
  };
}

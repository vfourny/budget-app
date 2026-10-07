import type { Apartment } from "@server/generated/prisma/client";
import { loanSchedule, splitLoanPayment } from "@shared/apartment-loan";

/** Champs d'un appartement utiles au prêt (un sous-ensemble du modèle Prisma). */
type LoanApartment = Pick<
  Apartment,
  | "loanPrincipalCents"
  | "loanRateBps"
  | "loanTermMonths"
  | "loanFirstDueDate"
  | "creditInsuranceCents"
>;

export interface LoanMatch {
  /** Montant prélevé reconnu comme l'échéance attendue du mois (R7) ? */
  recognized: boolean;
  /** Mensualité attendue d'après le tableau d'amortissement (hors assurance). */
  expectedCents: number;
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
    return null;
  }
  const installment = loanSchedule({
    principalCents: apartment.loanPrincipalCents,
    rateBps: apartment.loanRateBps,
    termMonths: apartment.loanTermMonths,
    firstDueDate: apartment.loanFirstDueDate,
  }).find((row) => row.year === transaction.year && row.month === transaction.month);
  if (!installment) return null;

  const split = splitLoanPayment(
    Math.abs(transaction.amountCents),
    installment,
    apartment.creditInsuranceCents,
  );
  return { recognized: split.recognized, expectedCents: installment.paymentCents };
}

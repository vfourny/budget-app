import type { TransactionCategory } from '@server/generated/prisma/enums'
import type { LoanTerms } from '@shared/apartment-loan'
import { loanSchedule } from '@shared/apartment-loan'

/**
 * Relevés 2025 du compte appartement de Toulouse (données de dev local). Les montants, libellés et
 * jours de prélèvement viennent des relevés réels d'août et septembre 2026 (sans références de
 * contrat ni de mandat) ; les mois de 2025 sont reconstitués d'après ces récurrences :
 * - acquisition en avril 2025 (mandat du syndic signé le 09/04/2025), 1re échéance de prêt le 30/05/2025 ;
 * - loyer net reçu de la gérance le 25 du mois, à partir de mai ;
 * - appel de fonds du syndic trimestriel (mai, août, novembre), en deux prélèvements le 10 ;
 * - taxe foncière en octobre ; pas de CFE la 1re année (exonération), donc aucune en 2025 ;
 * - apport mensuel du compte perso pour couvrir l'effort d'épargne.
 * Montants en centimes, signés (négatif = débit).
 */
const YEAR = 2025
const ACQUISITION_MONTH = 4

/** Loyer net versé par la gérance (735,31 € : relevé d'août 2026). */
const NET_RENT_CENTS = 73_531

const MONTH_NAMES = [
  'JANVIER',
  'FEVRIER',
  'MARS',
  'AVRIL',
  'MAI',
  'JUIN',
  'JUILLET',
  'AOUT',
  'SEPTEMBRE',
  'OCTOBRE',
  'NOVEMBRE',
  'DECEMBRE',
] as const

interface MonthlyDebit {
  amountCents: number
  category: TransactionCategory
  /** Jour de prélèvement, ramené à la fin du mois si besoin. */
  day: number
  firstMonth: number
  label: string
}

/** Prélèvements mensuels du compte (hors prêt, loyer et syndic). */
const MONTHLY_DEBITS = [
  {
    label: 'PRLV SEPA PayPal Europe',
    amountCents: 799,
    category: 'APT_OTHER',
    day: 3,
    firstMonth: 5,
  },
  {
    label: 'PRLV SEPA BPCE ASSURANCE HABITATION',
    amountCents: 2_402,
    category: 'APT_HOME_INSURANCE',
    day: 5,
    firstMonth: 4,
  },
  {
    label: 'PRLV SEPA Kereis France',
    amountCents: 1_421,
    category: 'APT_LOAN_INSURANCE',
    day: 5,
    firstMonth: 5,
  },
  {
    label: 'PRLV SEPA ENGIE',
    amountCents: 10_714,
    category: 'ENERGY',
    day: 28,
    firstMonth: 5,
  },
  {
    label: 'PRLV SEPA Bouygues Telecom',
    amountCents: 2_699,
    category: 'INTERNET',
    day: 30,
    firstMonth: 5,
  },
] as const satisfies readonly MonthlyDebit[]

/** Appel de fonds trimestriel du syndic : deux prélèvements le 10 (48,00 € et 332,91 €). */
const CONDO_MONTHS = [5, 8, 11] as const
const CONDO_DEBITS_CENTS = [4_800, 33_291] as const

/** Apport du compte perso : mise de départ à l'acquisition, puis virement mensuel. */
const INITIAL_CONTRIBUTION_CENTS = 250_000
const MONTHLY_CONTRIBUTION_CENTS = 75_000

export interface SeedTransaction {
  amountCents: number
  category: TransactionCategory
  date: Date
  label: string
}

export interface SeedStatement {
  /** 1-12. */
  month: number
  /** Triées par date. */
  transactions: SeedTransaction[]
}

export interface SeedManagementInvoice {
  feesCents: number
  month: number
}

export interface ApartmentStatements2025 {
  /** Solde du compte au 31/12/2025 (sert de solde d'ouverture 2026). */
  closingBalanceCents: number
  managementInvoices: SeedManagementInvoice[]
  statements: SeedStatement[]
  year: typeof YEAR
}

function utcDate(month: number, day: number) {
  const lastDay = new Date(Date.UTC(YEAR, month, 0)).getUTCDate()
  return new Date(Date.UTC(YEAR, month - 1, Math.min(day, lastDay)))
}

function statementOf(
  month: number,
  loan: LoanTerms,
  propertyTaxCents: number,
): SeedStatement {
  const transactions: SeedTransaction[] = []
  const add = (
    day: number,
    label: string,
    amountCents: number,
    category: TransactionCategory,
  ) => {
    transactions.push({
      date: utcDate(month, day),
      label,
      amountCents,
      category,
    })
  }

  // Apport du compte perso (crédit).
  add(
    2,
    'VIR Valentin Fourny apport appartement',
    month === ACQUISITION_MONTH
      ? INITIAL_CONTRIBUTION_CENTS
      : MONTHLY_CONTRIBUTION_CENTS,
    'APT_OWNER_CONTRIBUTION',
  )

  for (const debit of MONTHLY_DEBITS) {
    if (month >= debit.firstMonth)
      add(debit.day, debit.label, -debit.amountCents, debit.category)
  }

  // Échéance du prêt : montant du tableau d'amortissement (reconnue par la règle R7).
  const installment = loanSchedule(loan).find(
    (item) => item.year === YEAR && item.month === month,
  )
  if (installment)
    add(
      installment.dueDate.getUTCDate(),
      'ECHEANCE PRET',
      -installment.paymentCents,
      'APT_LOAN_REPAYMENT',
    )

  if (month > ACQUISITION_MONTH)
    add(
      25,
      `VIR GESTION LOCATIVE MYROOM Rglt ${MONTH_NAMES[month - 1]}`,
      NET_RENT_CENTS,
      'APT_RENT_RECEIVED',
    )

  if (CONDO_MONTHS.some((condoMonth) => condoMonth === month))
    for (const amountCents of CONDO_DEBITS_CENTS)
      add(10, 'PRLV SEPA SYNDIC CITYA', -amountCents, 'APT_CONDO_FEES')

  if (month === 10)
    add(15, 'PRLV DGFIP TAXE FONCIERE', -propertyTaxCents, 'APT_PROPERTY_TAX')

  // Un incident de prélèvement facturé 8 €, pour alimenter la ligne « Frais bancaires ».
  if (month === 7) add(7, 'Frais Com Intervention', -800, 'APT_BANK_FEES')

  transactions.sort((a, b) => a.date.getTime() - b.date.getTime())
  return { month, transactions }
}

/**
 * Relevés mensuels d'avril à décembre 2025, factures de gérance (loyer brut − loyer net reçu) et
 * solde de clôture. Fonction pure : aucun accès base.
 */
export function buildApartmentStatements2025({
  loan,
  propertyTaxCents,
  rentCents,
}: {
  loan: LoanTerms
  propertyTaxCents: number
  /** Loyer mensuel brut de l'appartement. */
  rentCents: number
}): ApartmentStatements2025 {
  const statements = Array.from(
    { length: 12 - ACQUISITION_MONTH + 1 },
    (_, index) =>
      statementOf(ACQUISITION_MONTH + index, loan, propertyTaxCents),
  )
  const managementInvoices = statements
    .filter(({ month }) => month > ACQUISITION_MONTH)
    .map(({ month }) => ({ month, feesCents: rentCents - NET_RENT_CENTS }))
  const closingBalanceCents = statements
    .flatMap(({ transactions }) => transactions)
    .reduce((sum, { amountCents }) => sum + amountCents, 0)
  return { year: YEAR, statements, managementInvoices, closingBalanceCents }
}

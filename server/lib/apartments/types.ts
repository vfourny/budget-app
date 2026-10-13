import type {
  ApartmentForecastLine,
  ApartmentKind,
  TransactionCategory,
} from '@server/generated/prisma/enums'
import type { LoanTerms } from '@shared/apartment-loan'

/** Appartement tel que les calculs le lisent (centimes, points de base). */
export interface ApartmentRecord {
  acquiredAt: Date
  creditInsuranceCents: number
  id: string
  kind: ApartmentKind
  loan: LoanTerms | null
  /** `false` = location en direct : ni facture de gérance, ni frais. */
  managed: boolean
  managementFeeBps: number
  name: string
  priceCents: number
}

/** Montant prévu saisi dans l'éditeur du prévisionnel (centimes, positif pour une charge). */
export interface ApartmentForecastRecord {
  amountCents: number
  line: ApartmentForecastLine
  month: number
  year: number
}

/** Transaction validée rattachée à un appartement. */
export interface ApartmentTransaction {
  /** Centimes, signé : négatif = débit. */
  amountCents: number
  apartmentId: string
  category: TransactionCategory | null
  date: Date
  id: string
  label: string
  month: number
  year: number
}

/** Facture de gérance saisie à la main (R12). */
export interface ManagementInvoiceRecord {
  apartmentId: string
  extraFeesCents: number
  feesCents: number
  month: number
}

/**
 * Lignes d'un tableau (R2), en **positif** pour les charges (le signe est porté par la ligne).
 * `netRent` = loyer net reçu (virements `APT_RENT_RECEIVED`) ; `grossRent` = net + frais de gérance.
 */
export interface ApartmentLines {
  bankFees: number
  cfe: number
  condoFees: number
  electricity: number
  extraManagementFees: number
  grossRent: number
  homeInsurance: number
  internetBox: number
  loanCapital: number
  loanInsurance: number
  loanInterest: number
  managementFees: number
  netRent: number
  other: number
  ownerContribution: number
  propertyTax: number
  regularization: number
}

export const ZERO_LINES = {
  grossRent: 0,
  netRent: 0,
  managementFees: 0,
  extraManagementFees: 0,
  loanCapital: 0,
  loanInterest: 0,
  loanInsurance: 0,
  electricity: 0,
  homeInsurance: 0,
  internetBox: 0,
  condoFees: 0,
  propertyTax: 0,
  cfe: 0,
  bankFees: 0,
  regularization: 0,
  other: 0,
  ownerContribution: 0,
} as const satisfies ApartmentLines

/** Une colonne du tableau (Prévisionnel ou Réalisé) : lignes + différentiel, effort et soldes (R5). */
export interface ApartmentColumn {
  closingBalanceCents: number
  /** Loyer net − crédit − charges (R5) ; ne dépend pas de l'apport. */
  differentialCents: number
  /** `max(0, −différentiel)` du mois ; sur plusieurs mois, somme des efforts mensuels. */
  effortCents: number
  lines: ApartmentLines
  /** Capital + intérêts + assurance emprunteur. */
  loanTotalCents: number
  openingBalanceCents: number
}

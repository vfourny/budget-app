import type { ApartmentKind, TransactionCategory } from "@server/generated/prisma/enums";
import type { LoanTerms } from "@shared/apartment-loan";

/** Appartement tel que les calculs le lisent (centimes, points de base). */
export interface ApartmentRecord {
  id: string;
  name: string;
  kind: ApartmentKind;
  /** `null` = location en direct : ni facture de gérance, ni frais. */
  managerName: string | null;
  acquiredAt: Date;
  priceCents: number;
  rentCents: number;
  depositCents: number;
  managementFeeBps: number;
  creditInsuranceCents: number;
  propertyTaxCents: number;
  cfeCents: number;
  loan: LoanTerms | null;
}

/** Transaction validée rattachée à un appartement. */
export interface ApartmentTransaction {
  id: string;
  date: Date;
  label: string;
  /** Centimes, signé : négatif = débit. */
  amountCents: number;
  category: TransactionCategory | null;
  apartmentId: string;
  year: number;
  month: number;
}

/** Facture de gérance saisie à la main (R12). */
export interface ManagementInvoiceRecord {
  apartmentId: string;
  month: number;
  feesCents: number;
  extraFeesCents: number;
}

/**
 * Lignes d'un tableau (R2), en **positif** pour les charges (le signe est porté par la ligne).
 * `netRent` = loyer net reçu (virements `APT_RENT_RECEIVED`) ; `grossRent` = net + frais de gérance.
 */
export interface ApartmentLines {
  grossRent: number;
  netRent: number;
  managementFees: number;
  extraManagementFees: number;
  loanCapital: number;
  loanInterest: number;
  loanInsurance: number;
  electricity: number;
  homeInsurance: number;
  internetBox: number;
  condoFees: number;
  propertyTax: number;
  cfe: number;
  bankFees: number;
  regularization: number;
  other: number;
  ownerContribution: number;
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
} as const satisfies ApartmentLines;

/** Une colonne du tableau (Prévisionnel ou Réalisé) : lignes + différentiel, effort et soldes (R5). */
export interface ApartmentColumn {
  lines: ApartmentLines;
  /** Capital + intérêts + assurance emprunteur. */
  loanTotalCents: number;
  /** Loyer net − crédit − charges (R5) ; ne dépend pas de l'apport. */
  differentialCents: number;
  /** `max(0, −différentiel)` du mois ; sur plusieurs mois, somme des efforts mensuels. */
  effortCents: number;
  openingBalanceCents: number;
  closingBalanceCents: number;
}

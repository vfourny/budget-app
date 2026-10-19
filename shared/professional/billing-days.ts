/*
 * Jours facturés : on ne facture qu'à la journée ou à la demi-journée. `BillingLine.days` est un
 * `Float` limité aux multiples de 0,5 : ces valeurs sont exactes en binaire (pas d'erreur
 * d'arrondi, contrairement à 0,1), donc pas besoin de stocker des demi-journées entières.
 */

/** Pas de saisie : la demi-journée. */
export const DAY_STEP = 0.5

/** Plafond d'une ligne : 31 jours. */
export const MAX_BILLED_DAYS = 31

/** Arrondit une saisie à la demi-journée la plus proche : 1,3 → 1,5. */
export function roundToDayStep(days: number): number {
  return Math.round(days / DAY_STEP) * DAY_STEP
}

/** Montant HT d'une ligne en centimes : jours × TJM. */
export function billingAmount(line: {
  dailyRateCents: number
  days: number
}): number {
  return Math.round(line.days * line.dailyRateCents)
}

/** TJM moyen (centimes) d'un montant facturé sur `days` jours ; 0 sans jour. */
export function averageDailyRate(amountCents: number, days: number): number {
  return days > 0 ? Math.round(amountCents / days) : 0
}

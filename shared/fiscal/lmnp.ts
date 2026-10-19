/*
 * Seuils légaux du LMNP (voir `docs/fonctionnel.md` › Appartements, R10). Données légales annuelles,
 * rangées avec le barème de l'IR dans `shared/fiscal/` : c'est ce dossier qu'il faut mettre à jour
 * chaque année (rappel automatique : `scripts/check-yearly-rules.ts`). Montants en centimes.
 */

/**
 * Plafond de recettes du micro-BIC par année, en centimes (R10). À titre indicatif : à valider avec le comptable.
 * ⚠️ Une entrée par année, même inchangée (revalorisé tous les 3 ans) : c'est la trace qu'elle a été vérifiée.
 */
const MICRO_BIC_CEILINGS_CENTS = {
  2025: 7_770_000,
  2026: 8_360_000,
} as const satisfies Record<number, number>

/** Seuil de recettes du statut LMP, en centimes (R10). La condition sur 50 % des revenus n'est pas calculée. */
export const LMP_THRESHOLD_CENTS = 2_300_000

/** `true` si le plafond micro-BIC de l'année est renseigné (rappel annuel : `scripts/check-yearly-rules.ts`). */
export function hasMicroBicCeiling(year: number): boolean {
  return year in MICRO_BIC_CEILINGS_CENTS
}

/** Plafond micro-BIC d'une année ; une année inconnue prend la dernière connue (ou la première si elle est antérieure). */
export function microBicCeilingCents(year: number): number {
  const years = Object.keys(MICRO_BIC_CEILINGS_CENTS)
    .map(Number)
    .sort((a, b) => a - b)
  const known =
    years.filter((knownYear) => knownYear <= year).at(-1) ?? years[0]
  return MICRO_BIC_CEILINGS_CENTS[
    known as keyof typeof MICRO_BIC_CEILINGS_CENTS
  ]
}

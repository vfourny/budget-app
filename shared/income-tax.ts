/** Tranche du barème de l'IR : seuil bas (centimes) et taux marginal (%). */
export interface IncomeTaxBracket {
  fromCents: number
  ratePercent: number
}

/**
 * Barème de l'IR (1 part) par année : clé = année affichée dans le dashboard Perso, tranches triées
 * par seuil croissant, la première à 0. Donnée légale, identique pour tous : elle vit dans le code.
 * ⚠️ CHAQUE NOUVELLE ANNÉE : ajouter son barème ici (publié avec la loi de finances), dans une PR.
 * Une année absente fait afficher « barème non renseigné » sur la card « IR estimé ».
 */
const INCOME_TAX_BRACKETS_BY_YEAR: Partial<
  Record<number, readonly IncomeTaxBracket[]>
> = {
  // Loi de finances 2025 (revenus 2024).
  2025: [
    { fromCents: 0, ratePercent: 0 },
    { fromCents: 1_149_700, ratePercent: 11 },
    { fromCents: 2_931_500, ratePercent: 30 },
    { fromCents: 8_382_300, ratePercent: 41 },
    { fromCents: 18_029_400, ratePercent: 45 },
  ],
  // Loi de finances 2026 (revenus 2025).
  2026: [
    { fromCents: 0, ratePercent: 0 },
    { fromCents: 1_160_000, ratePercent: 11 },
    { fromCents: 2_957_900, ratePercent: 30 },
    { fromCents: 8_457_700, ratePercent: 41 },
    { fromCents: 18_191_700, ratePercent: 45 },
  ],
}

/** Barème d'une année, `undefined` s'il n'est pas encore dans le code. */
export function incomeTaxBrackets(
  year: number,
): readonly IncomeTaxBracket[] | undefined {
  return INCOME_TAX_BRACKETS_BY_YEAR[year]
}

/**
 * Estimation grossière de l'IR pour 1 part : barème progressif appliqué au revenu annuel, sans
 * abattement ni réductions. Entiers en centimes.
 */
export function estimateIncomeTaxCents(
  annualRevenueCents: number,
  brackets: readonly IncomeTaxBracket[],
): number {
  let tax = 0
  brackets.forEach((bracket, index) => {
    const upper = brackets[index + 1]?.fromCents ?? Infinity
    const slice = Math.min(annualRevenueCents, upper) - bracket.fromCents
    if (slice > 0) tax += (slice * bracket.ratePercent) / 100
  })
  return Math.round(tax)
}

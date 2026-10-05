import type { IncomeTaxBracket as PrismaIncomeTaxBracket } from "@server/generated/prisma/browser";

/** Tranche du barème de l'IR : seuil bas (centimes) et taux marginal (%). */
export type IncomeTaxBracket = Pick<PrismaIncomeTaxBracket, "fromCents" | "ratePercent">;

/**
 * Estimation grossière de l'IR pour 1 part : barème progressif (tranches saisies dans Réglages,
 * triées par seuil croissant) appliqué au revenu annuel, sans abattement ni réductions.
 * Entiers en centimes.
 */
export function estimateIncomeTaxCents(
  annualRevenueCents: number,
  brackets: readonly IncomeTaxBracket[],
): number {
  let tax = 0;
  brackets.forEach((bracket, index) => {
    const upper = brackets[index + 1]?.fromCents ?? Infinity;
    const slice = Math.min(annualRevenueCents, upper) - bracket.fromCents;
    if (slice > 0) tax += (slice * bracket.ratePercent) / 100;
  });
  return Math.round(tax);
}

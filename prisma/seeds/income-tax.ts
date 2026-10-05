import { db } from "@server/lib/db";

/**
 * Barème de l'IR (1 part) par année : clé = année affichée dans le dashboard Perso, valeur =
 * tranches `[seuil bas en centimes, taux marginal en %]`, triées par seuil croissant.
 * ⚠️ À COMPLÉTER CHAQUE ANNÉE : ajouter ici le barème de la nouvelle année (publié avec la loi de
 * finances), puis relancer `pnpm db:seed`. Une année absente de la base fait afficher « barème non
 * renseigné » sur la card « IR estimé » (on peut aussi le saisir dans Réglages).
 */
const INCOME_TAX_BRACKETS_BY_YEAR: Record<number, readonly (readonly [number, number])[]> = {
  // Loi de finances 2025 (revenus 2024).
  2025: [
    [0, 0],
    [1_149_700, 11],
    [2_931_500, 30],
    [8_382_300, 41],
    [18_029_400, 45],
  ],
  // Loi de finances 2026 (revenus 2025).
  2026: [
    [0, 0],
    [1_160_000, 11],
    [2_957_900, 30],
    [8_457_700, 41],
    [18_191_700, 45],
  ],
};

/** Insère les barèmes manquants ; une année déjà en base (saisie dans Réglages) n'est jamais écrasée. */
export async function seedIncomeTaxBrackets() {
  for (const [year, brackets] of Object.entries(INCOME_TAX_BRACKETS_BY_YEAR)) {
    const exists = await db.incomeTaxBracket.count({ where: { year: Number(year) } });
    if (exists > 0) {
      process.stdout.write(`Barème IR ${year} déjà présent` + "\n");
      continue;
    }
    await db.incomeTaxBracket.createMany({
      data: brackets.map(([fromCents, ratePercent]) => ({
        year: Number(year),
        fromCents,
        ratePercent,
      })),
    });
    process.stdout.write(`Barème IR ${year} créé` + "\n");
  }
}

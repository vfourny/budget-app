import "dotenv/config";

import { auth } from "@server/lib/auth";
import { db } from "@server/lib/db";

// Seed : crée l'unique compte de l'app (l'inscription HTTP est désactivée) et insère les barèmes
// de l'IR. Lancé automatiquement par `pnpm db:reset` (prisma migrate reset) ou à la main avec
// `pnpm db:seed` (à relancer sur chaque base, develop et production, après avoir complété la
// liste ci-dessous). Idempotent. Identifiants lus dans `.env` (SEED_USER_*).

/**
 * Barème de l'IR (1 part) par année : clé = année affichée dans le dashboard Perso, valeur =
 * tranches `[seuil bas en centimes, taux marginal en %]`, triées par seuil croissant.
 * ⚠️ À COMPLÉTER CHAQUE ANNÉE : ajouter ici le barème de la nouvelle année (publié avec la loi de
 * finances), puis relancer `pnpm db:seed`. Une année absente de la base fait afficher « barème non
 * renseigné » sur la card « IR estimé » (on peut aussi le saisir dans Réglages).
 * Le seed n'écrase jamais une année déjà présente en base (donc pas une saisie faite dans Réglages).
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

const email = process.env.SEED_USER_EMAIL;
const password = process.env.SEED_USER_PASSWORD;
const name = process.env.SEED_USER_NAME ?? "Valentin";

if (!email || !password) {
  console.error(
    "SEED_USER_EMAIL et SEED_USER_PASSWORD sont requis dans .env pour créer le compte.",
  );
  process.exit(1);
}

const ctx = await auth.$context;

if (await ctx.internalAdapter.findUserByEmail(email)) {
  process.stdout.write(`Compte déjà présent : ${email}` + "\n");
} else {
  if (password.length < ctx.password.config.minPasswordLength) {
    console.error(
      `SEED_USER_PASSWORD trop court (${ctx.password.config.minPasswordLength} caractères min.).`,
    );
    process.exit(1);
  }
  // Même mécanique que l'inscription Better Auth : un User + un Account « credential » (hash).
  const user = await ctx.internalAdapter.createUser(
    { email, name, emailVerified: true },
    { method: "email-password" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(password),
  });
  process.stdout.write(`Compte créé : ${email}` + "\n");
}

await db.$disconnect();

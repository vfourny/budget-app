import "dotenv/config";

import { auth } from "@server/lib/auth";
import { db } from "@server/lib/db";

// Seed : crée l'unique compte de l'app (l'inscription HTTP est désactivée). Lancé automatiquement
// par `pnpm db:reset` (prisma migrate reset) ou à la main avec `pnpm db:seed`. Idempotent : si le
// compte existe déjà, il ne fait rien. Identifiants lus dans `.env` (SEED_USER_*).
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

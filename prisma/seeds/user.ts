import { auth } from "@server/lib/auth";

/**
 * Crée l'unique compte de l'app (l'inscription HTTP est désactivée) depuis `SEED_USER_*` dans
 * `.env`, ou retrouve le compte existant. Renvoie son id pour les seeds qui en dépendent.
 */
export async function seedUser(): Promise<string> {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  const name = process.env.SEED_USER_NAME ?? "Valentin";

  if (!email || !password) {
    throw new Error(
      "SEED_USER_EMAIL et SEED_USER_PASSWORD sont requis dans .env pour créer le compte.",
    );
  }

  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing) {
    process.stdout.write(`Compte déjà présent : ${email}` + "\n");
    return existing.user.id;
  }

  const minLength = ctx.password.config.minPasswordLength;
  if (password.length < minLength) {
    throw new Error(`SEED_USER_PASSWORD trop court (${minLength} caractères min.).`);
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
  return user.id;
}

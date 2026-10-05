import "dotenv/config";

import { db } from "@server/lib/db";

import { seedIncomeTaxBrackets } from "./seeds/income-tax";
import { seedProBilling } from "./seeds/pro-billing";
import { seedUser } from "./seeds/user";

// Seed : lancé automatiquement par `pnpm db:reset` (prisma migrate reset) ou à la main avec
// `pnpm db:seed` (à relancer sur chaque base, develop et production). Chaque domaine a son fichier
// dans `prisma/seeds/`, idempotent : relancer le seed ne crée pas de doublon et n'écrase pas les
// saisies faites dans l'app.

try {
  await seedIncomeTaxBrackets();
  const userId = await seedUser();
  await seedProBilling(userId);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}

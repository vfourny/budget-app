import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 : la CLI (migrate, studio) lit sa config ici, plus dans le schéma.
// On passe par la connexion DIRECTE (non-pooled) : les migrations ont besoin d'une session
// Postgres stable, incompatible avec le pooler PgBouncer de Neon.
export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    // Exécuté par `prisma db seed` et automatiquement après `prisma migrate reset`.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Pas de `env()` ici : il throw si la variable est absente, ce qui casserait
    // `prisma generate` en CI (qui n'a pas besoin de DB).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});

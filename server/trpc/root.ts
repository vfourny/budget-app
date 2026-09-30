import { bankAccountRouter } from "@server/trpc/routers/bank-account";
import { importRouter } from "@server/trpc/routers/import";
import { createTRPCRouter } from "@server/trpc/init";

// Enregistrer chaque routeur de domaine ici.
export const appRouter = createTRPCRouter({
  bankAccount: bankAccountRouter,
  import: importRouter,
});

/** Type du routeur, importé (en `import type` uniquement) par le front pour l'inférence. */
export type AppRouter = typeof appRouter;

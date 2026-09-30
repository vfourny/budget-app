import { bankAccountRouter } from "@server/trpc/routers/bank-account";
import { categorizeRouter } from "@server/trpc/routers/categorize";
import { importRouter } from "@server/trpc/routers/import";
import { transactionRouter } from "@server/trpc/routers/transaction";
import { createTRPCRouter } from "@server/trpc/init";

// Enregistrer chaque routeur de domaine ici.
export const appRouter = createTRPCRouter({
  bankAccount: bankAccountRouter,
  categorize: categorizeRouter,
  import: importRouter,
  transaction: transactionRouter,
});

/** Type du routeur, importé (en `import type` uniquement) par le front pour l'inférence. */
export type AppRouter = typeof appRouter;

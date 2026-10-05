import { categorizeRouter } from "@server/trpc/routers/categorize";
import { clientRouter } from "@server/trpc/routers/client";
import { importRouter } from "@server/trpc/routers/import";
import { personalRouter } from "@server/trpc/routers/personal";
import { professionalRouter } from "@server/trpc/routers/professional";
import { settingsRouter } from "@server/trpc/routers/settings";
import { transactionRouter } from "@server/trpc/routers/transaction";
import { createTRPCRouter } from "@server/trpc/init";

// Enregistrer chaque routeur de domaine ici.
export const appRouter = createTRPCRouter({
  categorize: categorizeRouter,
  client: clientRouter,
  import: importRouter,
  personal: personalRouter,
  professional: professionalRouter,
  settings: settingsRouter,
  transaction: transactionRouter,
});

/** Type du routeur, importé (en `import type` uniquement) par le front pour l'inférence. */
export type AppRouter = typeof appRouter;

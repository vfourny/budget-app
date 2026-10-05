import { categorizeRouter } from "@server/trpc/routers/categorize";
import { importRouter } from "@server/trpc/routers/import";
import { personalRouter } from "@server/trpc/routers/personal";
import { professionalForecastRouter } from "@server/trpc/routers/professional-forecast";
import { professionalRouter } from "@server/trpc/routers/professional";
import { settingsRouter } from "@server/trpc/routers/settings";
import { transactionRouter } from "@server/trpc/routers/transaction";
import { tripRouter } from "@server/trpc/routers/trip";
import { createTRPCRouter } from "@server/trpc/init";

// Enregistrer chaque routeur de domaine ici.
export const appRouter = createTRPCRouter({
  categorize: categorizeRouter,
  import: importRouter,
  personal: personalRouter,
  professional: professionalRouter,
  professionalForecast: professionalForecastRouter,
  settings: settingsRouter,
  transaction: transactionRouter,
  trip: tripRouter,
});

/** Type du routeur, importé (en `import type` uniquement) par le front pour l'inférence. */
export type AppRouter = typeof appRouter;

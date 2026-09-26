import { createTRPCRouter } from "@server/trpc/init";
import { categoryRouter } from "@server/trpc/routers/category";

export const appRouter = createTRPCRouter({
  category: categoryRouter,
});

/** Type du routeur, importé (en `import type` uniquement) par le front pour l'inférence. */
export type AppRouter = typeof appRouter;

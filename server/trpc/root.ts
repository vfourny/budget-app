import { createTRPCRouter } from "@server/trpc/init";

// Vide pour l'instant : le premier routeur (import CSV) arrive avec la PR d'import.
// Enregistrer chaque routeur de domaine ici : `import: importRouter`.
export const appRouter = createTRPCRouter({});

/** Type du routeur, importé (en `import type` uniquement) par le front pour l'inférence. */
export type AppRouter = typeof appRouter;

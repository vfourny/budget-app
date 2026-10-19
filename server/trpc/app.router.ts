import { apartmentRouter } from '@server/trpc/routers/apartment.router'
import { importRouter } from '@server/trpc/routers/import.router'
import { personalRouter } from '@server/trpc/routers/personal.router'
import { professionalRouter } from '@server/trpc/routers/professional.router'
import { transactionRouter } from '@server/trpc/routers/transaction.router'
import { createTRPCRouter } from '@server/trpc/trpc.config'

/**
 * Un routeur par domaine ; les écrans d'un domaine y sont imbriqués (`professional.forecast`,
 * `apartment.dashboard`, `import.categorize`…), dans des fichiers `<domaine>-<écran>.router.ts`.
 */
export const appRouter = createTRPCRouter({
  apartment: apartmentRouter,
  import: importRouter,
  personal: personalRouter,
  professional: professionalRouter,
  transaction: transactionRouter,
})

/** Type du routeur, importé (en `import type` uniquement) par le front pour l'inférence. */
export type AppRouter = typeof appRouter

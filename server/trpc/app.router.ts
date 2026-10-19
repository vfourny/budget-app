import { apartmentDashboardRouter } from '@server/trpc/routers/apartment-dashboard.router'
import { apartmentForecastRouter } from '@server/trpc/routers/apartment-forecast.router'
import { apartmentRouter } from '@server/trpc/routers/apartment.router'
import { categorizeRouter } from '@server/trpc/routers/categorize.router'
import { importRouter } from '@server/trpc/routers/import.router'
import { personalRouter } from '@server/trpc/routers/personal.router'
import { professionalForecastRouter } from '@server/trpc/routers/professional-forecast.router'
import { professionalRouter } from '@server/trpc/routers/professional.router'
import { settingsRouter } from '@server/trpc/routers/settings.router'
import { transactionRouter } from '@server/trpc/routers/transaction.router'
import { tripRouter } from '@server/trpc/routers/trip.router'
import { createTRPCRouter } from '@server/trpc/trpc.config'

// Enregistrer chaque routeur de domaine ici.
export const appRouter = createTRPCRouter({
  apartment: apartmentRouter,
  apartmentDashboard: apartmentDashboardRouter,
  apartmentForecast: apartmentForecastRouter,
  categorize: categorizeRouter,
  import: importRouter,
  personal: personalRouter,
  professional: professionalRouter,
  professionalForecast: professionalForecastRouter,
  settings: settingsRouter,
  transaction: transactionRouter,
  trip: tripRouter,
})

/** Type du routeur, importé (en `import type` uniquement) par le front pour l'inférence. */
export type AppRouter = typeof appRouter

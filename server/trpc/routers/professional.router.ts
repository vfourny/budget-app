import { loadProfessionalYear } from '@server/services/professional/load-year.service'
import { validatedTransactions } from '@server/services/transactions/scope.service'
import { professionalForecastRouter } from '@server/trpc/routers/professional-forecast.router'
import { professionalSettingsRouter } from '@server/trpc/routers/professional-settings.router'
import { professionalTripRouter } from '@server/trpc/routers/professional-trip.router'
import { createTRPCRouter, protectedProcedure } from '@server/trpc/trpc.config'
import { yearMonthSchema, yearSchema } from '@shared/period.schema'
import { currentYearMonth } from '@shared/year-month.util'
import { z } from 'zod'

export const professionalRouter = createTRPCRouter({
  /** Éditeur du prévisionnel (facturation, charges, salaire, km). */
  forecast: professionalForecastRouter,
  /** Réglages › Pro (règles de l'année). */
  settings: professionalSettingsRouter,
  /** Journal des trajets (frais kilométriques). */
  trips: professionalTripRouter,

  /**
   * Mois proposés par le sélecteur (du plus récent au plus ancien) : les 12 mois de chaque année qui
   * a des données pro (relevé validé ou facturation), de l'année en cours et de la suivante (pour
   * préparer le prévisionnel). Les mois à venir sont inclus : ils affichent le prévisionnel.
   */
  periods: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const [transactionYears, billingYears] = await Promise.all([
      ctx.db.transaction.groupBy({
        by: ['year'],
        where: validatedTransactions(userId, 'PROFESSIONAL'),
      }),
      ctx.db.billingLine.groupBy({ by: ['year'], where: { userId } }),
    ])
    const years = new Set([
      currentYearMonth().year,
      currentYearMonth().year + 1,
      ...transactionYears.map((row) => row.year),
      ...billingYears.map((row) => row.year),
    ])
    return [...years]
      .sort((a, b) => b - a)
      .flatMap((year) =>
        Array.from({ length: 12 }, (_, index) => ({ year, month: 12 - index })),
      )
  }),

  /** Un mois : prévu et réel de chaque bloc (voir `computeMonth`) + ses transactions pro validées. */
  month: protectedProcedure
    .input(yearMonthSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const [months, transactions, trips] = await Promise.all([
        loadProfessionalYear(ctx.db, userId, input.year),
        ctx.db.transaction.findMany({
          where: {
            ...validatedTransactions(userId, 'PROFESSIONAL'),
            year: input.year,
            month: input.month,
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            date: true,
            label: true,
            amountCents: true,
            category: true,
          },
        }),
        ctx.db.trip.findMany({
          where: { userId, year: input.year, month: input.month },
          orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, date: true, route: true, reason: true, km: true },
        }),
      ])
      const month = months[input.month - 1]
      // loadProfessionalYear renvoie toujours les 12 mois : jamais atteint.
      if (!month) throw new Error(`Missing month ${input.month}`)
      // Cumul des km réalisés depuis janvier (mois passés et mois affiché).
      const mileageToDate = months.slice(0, input.month).reduce(
        (total, m) => ({
          km: total.km + (m.mileage.actualKm ?? 0),
          cents: total.cents + (m.mileage.amount.actual ?? 0),
        }),
        { km: 0, cents: 0 },
      )
      return { ...month, transactions, trips, mileageToDate }
    }),

  /** Les 12 mois d'une année (vue année, et contexte du mois : TVA du mois précédent, cumuls). */
  year: protectedProcedure
    .input(z.object({ year: yearSchema }))
    .query(({ ctx, input }) =>
      loadProfessionalYear(ctx.db, ctx.session.user.id, input.year),
    ),
})

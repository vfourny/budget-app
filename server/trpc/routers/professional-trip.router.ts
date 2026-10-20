import { appError } from '@server/lib/app-error.util'
import { createTRPCRouter, protectedProcedure } from '@server/trpc/trpc.config'
import { utcDay, yearMonthOf } from '@shared/common/year-month.util'
import { z } from 'zod'

export const professionalTripRouter = createTRPCRouter({
  /** Ajoute un trajet au journal des frais kilométriques (km réels de son mois). */
  create: protectedProcedure
    .input(
      z.object({
        /** Date du trajet (jour civil, minuit UTC). */
        date: z.date(),
        route: z.string().trim().min(1).max(120),
        reason: z.string().trim().max(120),
        km: z.number().int().min(1).max(5_000),
      }),
    )
    .mutation(({ ctx, input }) => {
      // Comme pour les transactions : jour civil en UTC, mois / année dénormalisés.
      const date = utcDay(input.date)
      return ctx.db.trip.create({
        data: {
          ...input,
          date,
          ...yearMonthOf(date),
          userId: ctx.session.user.id,
        },
        select: { id: true },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.trip.deleteMany({
        where: { id: input.id, userId: ctx.session.user.id },
      })
      if (count === 0) throw appError('NOT_FOUND', 'TRIP_NOT_FOUND')
      return input
    }),
})

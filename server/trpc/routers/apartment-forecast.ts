import { ApartmentForecastLine } from '@server/generated/prisma/enums'
import { apartmentYear } from '@server/lib/apartments/build-view'
import { loadApartmentData } from '@server/lib/apartments/load-period'
import { currentYearMonth } from '@server/lib/apartments/period'
import { appError } from '@server/lib/app-error'
import { createTRPCRouter, protectedProcedure } from '@server/trpc/init'
import { z } from 'zod'

const periodSchema = z.object({
  apartmentId: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
})

/** Éditeur du prévisionnel d'un appartement (R3) : une saisie par ligne et par mois. */
export const apartmentForecastRouter = createTRPCRouter({
  /**
   * Lignes saisissables d'un mois : saisie du mois (`null` sans saisie) et valeur par défaut. Vide si
   * l'appartement n'est pas encore actif ce mois-là.
   */
  inputs: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const data = await loadApartmentData(
        ctx.db,
        ctx.session.user.id,
        input.year,
      )
      const apartment = data.apartments.find((a) => a.id === input.apartmentId)
      if (!apartment) throw appError('NOT_FOUND', 'APARTMENT_NOT_FOUND')
      const month = apartmentYear(
        data,
        apartment,
        input.year,
        currentYearMonth(),
      ).find((result) => result.month === input.month)
      return month?.forecastInputs ?? []
    }),

  /** Enregistre les saisies d'un mois ; `null` = revenir à la valeur par défaut. */
  set: protectedProcedure
    .input(
      periodSchema.extend({
        values: z
          .array(
            z.object({
              line: z.enum(ApartmentForecastLine),
              amountCents: z.number().int().min(0).max(1_000_000_00).nullable(),
            }),
          )
          .max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const { apartmentId, year, month } = input
      const apartment = await ctx.db.apartment.findFirst({
        where: { id: apartmentId, userId },
        select: { id: true },
      })
      if (!apartment) throw appError('NOT_FOUND', 'APARTMENT_NOT_FOUND')
      await ctx.db.$transaction(
        input.values.map(({ line, amountCents }) =>
          amountCents === null
            ? ctx.db.apartmentForecast.deleteMany({
                where: { apartmentId, year, month, line },
              })
            : ctx.db.apartmentForecast.upsert({
                where: {
                  apartmentId_year_month_line: {
                    apartmentId,
                    year,
                    month,
                    line,
                  },
                },
                create: { userId, apartmentId, year, month, line, amountCents },
                update: { amountCents },
              }),
        ),
      )
      return { count: input.values.length }
    }),
})

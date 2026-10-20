import { ApartmentForecastLine } from '@server/generated/prisma/enums'
import { apartmentYear } from '@server/services/apartments/build-view.service'
import { loadApartmentData } from '@server/services/apartments/load-period.service'
import { appError } from '@server/utils/app-error.util'
import { findOwnedApartment } from '@server/utils/ownership.service'
import { createTRPCRouter, protectedProcedure } from '@server/trpc/trpc.config'
import { yearMonthSchema } from '@shared/period.schema'
import { currentYearMonth } from '@shared/year-month.util'
import { z } from 'zod'

const cents = z.number().int().min(0).max(1_000_000_00)

const periodSchema = yearMonthSchema.extend({
  apartmentId: z.string().min(1),
})

/**
 * Éditeur du prévisionnel d'un appartement (R3) : une saisie par ligne et par mois, plus la gérance
 * d'un bien géré (taux prévu et facture du mois, R12).
 */
export const apartmentForecastRouter = createTRPCRouter({
  /**
   * Lignes saisissables d'un mois : saisie du mois (`null` sans saisie) et valeur par défaut (vide si
   * l'appartement n'est pas encore actif ce mois-là). `management` : taux de gérance et facture du
   * mois, `null` pour un bien en direct.
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
      return {
        lines: month?.forecastInputs ?? [],
        management: apartment.managed
          ? {
              feeBps: apartment.managementFeeBps,
              /** Seul un mois clos a un réalisé (R1) : la facture se saisit alors. */
              closed: month?.closed ?? false,
              invoice: month?.invoice
                ? {
                    feesCents: month.invoice.feesCents,
                    extraFeesCents: month.invoice.extraFeesCents,
                  }
                : null,
            }
          : null,
      }
    }),

  /**
   * Enregistre les saisies d'un mois (`null` = revenir à la valeur par défaut) et, pour un bien géré,
   * le taux de gérance (tous les mois) et la facture du mois. Refusé pour la gérance d'un bien en direct.
   */
  set: protectedProcedure
    .input(
      periodSchema.extend({
        values: z
          .array(
            z.object({
              line: z.enum(ApartmentForecastLine),
              amountCents: cents.nullable(),
            }),
          )
          .max(20),
        /** Points de base du loyer brut (7,00 % = 700). Absent = inchangé. */
        managementFeeBps: z.number().int().min(0).max(10_000).optional(),
        /** Facture de gérance du mois. Absente = inchangée. */
        invoice: z
          .object({ feesCents: cents, extraFeesCents: cents })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const { apartmentId, year, month, managementFeeBps, invoice } = input
      const apartment = await findOwnedApartment(ctx.db, userId, apartmentId)
      if (
        !apartment.managed &&
        (managementFeeBps !== undefined || invoice !== undefined)
      )
        throw appError('BAD_REQUEST', 'APARTMENT_NO_MANAGER')
      await ctx.db.$transaction([
        ...input.values.map(({ line, amountCents }) =>
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
        ...(managementFeeBps === undefined
          ? []
          : [
              ctx.db.apartment.updateMany({
                where: { id: apartmentId, userId },
                data: { managementFeeBps },
              }),
            ]),
        ...(invoice === undefined
          ? []
          : [
              ctx.db.managementInvoice.upsert({
                where: { apartmentId_year_month: { apartmentId, year, month } },
                create: { userId, apartmentId, year, month, ...invoice },
                update: invoice,
              }),
            ]),
      ])
      return { count: input.values.length }
    }),
})

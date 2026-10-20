import { ApartmentKind } from '@server/generated/prisma/enums'
import { apartmentDashboardRouter } from '@server/trpc/routers/apartment-dashboard.router'
import { apartmentForecastRouter } from '@server/trpc/routers/apartment-forecast.router'
import { createTRPCRouter, protectedProcedure } from '@server/trpc/trpc.config'
import { appError } from '@server/utils/app-error.util'
import { findOwnedApartment } from '@server/utils/ownership.service'
import { yearSchema } from '@shared/period.schema'
import { utcDay } from '@shared/year-month.util'
import { z } from 'zod'

const cents = z.number().int().min(0).max(2_000_000_000)

/** Prêt à taux fixe : les quatre champs ensemble, ou pas de prêt (`null`). */
const loanSchema = z.object({
  principalCents: z.number().int().min(1).max(2_000_000_000),
  /** Points de base : 3,00 % = 300. */
  rateBps: z.number().int().min(0).max(10_000),
  termMonths: z.number().int().min(1).max(600),
  firstDueDate: z.date(),
})

const saveSchema = z.object({
  /** Absent = création. Le taux de gérance se saisit dans l'éditeur du prévisionnel. */
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(60),
  kind: z.enum(ApartmentKind),
  /** `false` = location en direct (pas de facture de gérance). */
  managed: z.boolean(),
  acquiredAt: z.date(),
  priceCents: cents,
  creditInsuranceCents: cents,
  loan: loanSchema.nullable(),
  /** Solde réel du compte appartement au 1er janvier de `openingYear` (R5). */
  openingYear: yearSchema,
  openingBalanceCents: z.number().int().min(-2_000_000_000).max(2_000_000_000),
})

export const apartmentRouter = createTRPCRouter({
  /** Dashboard `/apartments` (mois, année, sélecteur de période). */
  dashboard: apartmentDashboardRouter,
  /** Éditeur du prévisionnel d'un appartement. */
  forecast: apartmentForecastRouter,

  /** Appartements de l'utilisateur, avec le solde de début d'année de `year` (0 si non saisi). */
  list: protectedProcedure
    .input(z.object({ year: yearSchema }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const rows = await ctx.db.apartment.findMany({
        where: { userId },
        orderBy: [{ acquiredAt: 'asc' }, { name: 'asc' }],
        include: { yearOpenings: { where: { year: input.year } } },
      })
      return rows.map(({ yearOpenings, ...apartment }) => ({
        id: apartment.id,
        name: apartment.name,
        kind: apartment.kind,
        managed: apartment.managed,
        acquiredAt: apartment.acquiredAt,
        priceCents: apartment.priceCents,
        creditInsuranceCents: apartment.creditInsuranceCents,
        loan:
          apartment.loanPrincipalCents !== null &&
          apartment.loanRateBps !== null &&
          apartment.loanTermMonths !== null &&
          apartment.loanFirstDueDate !== null
            ? {
                principalCents: apartment.loanPrincipalCents,
                rateBps: apartment.loanRateBps,
                termMonths: apartment.loanTermMonths,
                firstDueDate: apartment.loanFirstDueDate,
              }
            : null,
        openingBalanceCents: yearOpenings[0]?.openingBalanceCents ?? 0,
      }))
    }),

  /** Id et nom des appartements, pour les sélecteurs (import, relecture). */
  options: protectedProcedure.query(({ ctx }) =>
    ctx.db.apartment.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: [{ acquiredAt: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    }),
  ),

  /** Crée ou met à jour un appartement et son solde de début d'année, en une transaction SQL. */
  save: protectedProcedure
    .input(saveSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const {
        id,
        loan,
        openingYear,
        openingBalanceCents,
        acquiredAt,
        ...fields
      } = input
      const data = {
        ...fields,
        // 1er du mois d'acquisition : l'appartement est actif à partir de ce mois (R1).
        acquiredAt: new Date(
          Date.UTC(acquiredAt.getUTCFullYear(), acquiredAt.getUTCMonth(), 1),
        ),
        loanPrincipalCents: loan?.principalCents ?? null,
        loanRateBps: loan?.rateBps ?? null,
        loanTermMonths: loan?.termMonths ?? null,
        loanFirstDueDate: loan ? utcDay(loan.firstDueDate) : null,
      }

      return ctx.db.$transaction(async (tx) => {
        let apartmentId = id
        if (apartmentId) {
          const { count } = await tx.apartment.updateMany({
            where: { id: apartmentId, userId },
            data,
          })
          if (count === 0) throw appError('NOT_FOUND', 'APARTMENT_NOT_FOUND')
        } else {
          apartmentId = (
            await tx.apartment.create({
              data: { ...data, userId },
              select: { id: true },
            })
          ).id
        }
        await tx.apartmentYearOpening.upsert({
          where: { apartmentId_year: { apartmentId, year: openingYear } },
          create: {
            userId,
            apartmentId,
            year: openingYear,
            openingBalanceCents,
          },
          update: { openingBalanceCents },
        })
        return { id: apartmentId }
      })
    }),

  /** Refusé tant que l'appartement porte des transactions ou des relevés (R11) : les détacher d'abord. */
  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await findOwnedApartment(ctx.db, userId, input.id)
      const [transactions, imports] = await Promise.all([
        ctx.db.transaction.count({ where: { userId, apartmentId: input.id } }),
        ctx.db.importBatch.count({ where: { userId, apartmentId: input.id } }),
      ])
      if (transactions > 0 || imports > 0)
        throw appError('CONFLICT', 'APARTMENT_HAS_TRANSACTIONS')
      await ctx.db.apartment.delete({ where: { id: input.id } })
      return input
    }),
})

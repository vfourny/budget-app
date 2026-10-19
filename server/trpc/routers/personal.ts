import { aggregatePeriod } from '@server/lib/dashboard/aggregate'
import { balanceAtEndOf, previousMonth } from '@server/lib/dashboard/balance'
import {
  periodsWithData,
  validatedTransactions,
} from '@server/lib/dashboard/scope'
import { createTRPCRouter, protectedProcedure } from '@server/trpc/init'
import { z } from 'zod'

const periodSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12).optional(),
})

export const personalRouter = createTRPCRouter({
  /** Mois ayant des données (du plus récent au plus ancien) : alimente le sélecteur de période. */
  periods: protectedProcedure.query(({ ctx }) =>
    periodsWithData(ctx.db, ctx.session.user.id, 'PERSONAL'),
  ),

  /**
   * Totaux d'un mois (`month` renseigné, avec le détail des transactions) ou d'une année entière
   * (`month` absent, avec la moyenne mensuelle sur les mois ayant des données).
   */
  overview: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.transaction.findMany({
        where: {
          ...validatedTransactions(ctx.session.user.id, 'PERSONAL'),
          year: input.year,
          ...(input.month !== undefined && { month: input.month }),
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          date: true,
          month: true,
          label: true,
          amountCents: true,
          category: true,
        },
      })

      const totals = aggregatePeriod(rows)
      const monthsWithData = new Set(rows.map((row) => row.month)).size

      return {
        ...totals,
        monthsWithData,
        transactions: input.month !== undefined ? rows : [],
      }
    }),

  /**
   * Solde du compte perso en début et fin de période (mois, ou année si `month` est absent) :
   * calculé depuis le repère saisi le plus récent (`AccountBalance`), `null` sans repère.
   */
  balance: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const [anchors, nets] = await Promise.all([
        ctx.db.accountBalance.findMany({
          where: { userId, accountType: 'PERSONAL' },
          select: { year: true, month: true, balanceCents: true },
        }),
        ctx.db.transaction.groupBy({
          by: ['year', 'month'],
          where: validatedTransactions(userId, 'PERSONAL'),
          _sum: { amountCents: true },
        }),
      ])
      const monthNets = nets.map((net) => ({
        year: net.year,
        month: net.month,
        cents: net._sum.amountCents ?? 0,
      }))
      const first = { year: input.year, month: input.month ?? 1 }
      const last = { year: input.year, month: input.month ?? 12 }

      return {
        /** Début de période = fin du mois précédent (c'est ce repère qu'on corrige). */
        opening: balanceAtEndOf(previousMonth(first), anchors, monthNets),
        closing: balanceAtEndOf(last, anchors, monthNets),
      }
    }),

  /** Saisit (ou efface avec `null`) le solde réel du compte perso en fin de mois. */
  setBalance: protectedProcedure
    .input(
      z.object({
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
        balanceCents: z.number().int().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const key = {
        userId: ctx.session.user.id,
        accountType: 'PERSONAL' as const,
        year: input.year,
        month: input.month,
      }
      if (input.balanceCents === null) {
        await ctx.db.accountBalance.deleteMany({ where: key })
        return
      }
      await ctx.db.accountBalance.upsert({
        where: { userId_accountType_year_month: key },
        create: { ...key, balanceCents: input.balanceCents },
        update: { balanceCents: input.balanceCents },
      })
    }),
})

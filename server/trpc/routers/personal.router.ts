import {
  periodsWithData,
  validatedTransactions,
} from '@server/lib/dashboard/scope.service'
import { loadPersonalBalance } from '@server/lib/personal/balance.service'
import { createTRPCRouter, protectedProcedure } from '@server/trpc/trpc.config'
import {
  monthSchema,
  yearMonthSchema,
  yearSchema,
} from '@shared/common/period.schema'
import { aggregatePeriod } from '@shared/personal/aggregate.calc'
import { z } from 'zod'

/** Un mois, ou l'année entière si `month` est absent. */
const periodSchema = z.object({
  year: yearSchema,
  month: monthSchema.optional(),
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
    .query(({ ctx, input }) =>
      loadPersonalBalance(ctx.db, ctx.session.user.id, input),
    ),

  /** Saisit (ou efface avec `null`) le solde réel du compte perso en fin de mois. */
  setBalance: protectedProcedure
    .input(
      yearMonthSchema.extend({
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

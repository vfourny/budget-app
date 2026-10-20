import type { Envelope } from '@server/generated/prisma/enums'
import { loadPersonalBalance } from '@server/lib/personal/balance.service'
import {
  periodsWithData,
  validatedTransactions,
} from '@server/lib/transactions/scope.service'
import { createTRPCRouter, protectedProcedure } from '@server/trpc/trpc.config'
import { monthSchema, yearMonthSchema, yearSchema } from '@shared/period.schema'
import { aggregatePeriod } from '@shared/personal/aggregate.calc'
import {
  BUDGET_ENVELOPES,
  DEFAULT_ENVELOPE_PERCENTS,
} from '@shared/personal/personal.rules'
import { z } from 'zod'

/** Un mois, ou l'année entière si `month` est absent. */
const periodSchema = z.object({
  year: yearSchema,
  month: monthSchema.optional(),
})

const envelopeSharesSchema = z
  .object(
    Object.fromEntries(
      BUDGET_ENVELOPES.map((envelope) => [
        envelope,
        z.number().int().min(0).max(100),
      ]),
    ) as Record<Envelope, z.ZodNumber>,
  )
  .refine(
    (shares) =>
      Object.values(shares).reduce((sum, percent) => sum + percent, 0) === 100,
    {
      message: 'Envelope shares must sum to exactly 100.',
    },
  )

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

  /** Part du revenu recommandée par enveloppe (valeurs par défaut si jamais configurée). */
  envelopeShares: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.envelopeShare.findMany({
      where: { userId: ctx.session.user.id },
    })
    const shares: Record<Envelope, number> = { ...DEFAULT_ENVELOPE_PERCENTS }
    for (const row of rows) {
      if (row.envelope in shares) shares[row.envelope] = row.percent
    }
    return shares
  }),

  /** Enregistre les 5 parts d'un coup (une seule transaction SQL). */
  setEnvelopeShares: protectedProcedure
    .input(envelopeSharesSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await ctx.db.$transaction(
        BUDGET_ENVELOPES.map((envelope) =>
          ctx.db.envelopeShare.upsert({
            where: { userId_envelope: { userId, envelope } },
            create: { userId, envelope, percent: input[envelope] },
            update: { percent: input[envelope] },
          }),
        ),
      )
      return input
    }),
})

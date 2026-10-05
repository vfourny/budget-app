import { z } from "zod";

import { aggregatePeriod } from "@server/lib/dashboard/aggregate";
import { periodsWithData, validatedTransactions } from "@server/lib/dashboard/scope";
import { createTRPCRouter, protectedProcedure } from "@server/trpc/init";

export const personalRouter = createTRPCRouter({
  /** Mois ayant des données (du plus récent au plus ancien) : alimente le sélecteur de période. */
  periods: protectedProcedure.query(({ ctx }) =>
    periodsWithData(ctx.db, ctx.session.user.id, "PERSONAL"),
  ),

  /**
   * Totaux d'un mois (`month` renseigné, avec le détail des transactions) ou d'une année entière
   * (`month` absent, avec la moyenne mensuelle sur les mois ayant des données).
   */
  overview: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12).optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.transaction.findMany({
        where: {
          ...validatedTransactions(ctx.session.user.id, "PERSONAL"),
          year: input.year,
          ...(input.month !== undefined && { month: input.month }),
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          date: true,
          month: true,
          label: true,
          amountCents: true,
          category: true,
        },
      });

      const totals = aggregatePeriod(rows);
      const monthsWithData = new Set(rows.map((row) => row.month)).size;

      return {
        ...totals,
        monthsWithData,
        transactions: input.month !== undefined ? rows : [],
      };
    }),
});

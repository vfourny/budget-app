import { z } from "zod";

import { aggregatePeriod } from "@server/lib/dashboard/aggregate";
import { createTRPCRouter, publicProcedure } from "@server/trpc/init";

/** Seules les transactions des imports VALIDATED du compte perso comptent dans le dashboard. */
const PERSONAL_VALIDATED = {
  accountType: "PERSO",
  importBatch: { status: "VALIDATED" },
} as const;

export const personalRouter = createTRPCRouter({
  /** Mois ayant des données (du plus récent au plus ancien) : alimente le sélecteur de période. */
  periods: publicProcedure.query(async ({ ctx }) => {
    const periods = await ctx.db.transaction.groupBy({
      by: ["year", "month"],
      where: PERSONAL_VALIDATED,
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return periods.map(({ year, month }) => ({ year, month }));
  }),

  /**
   * Totaux d'un mois (`month` renseigné, avec le détail des transactions) ou d'une année entière
   * (`month` absent, avec la moyenne mensuelle sur les mois ayant des données).
   */
  overview: publicProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12).optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.transaction.findMany({
        where: {
          ...PERSONAL_VALIDATED,
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

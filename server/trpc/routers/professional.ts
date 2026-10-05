import { z } from "zod";

import { validatedTransactions } from "@server/lib/dashboard/scope";
import { loadProYear } from "@server/lib/pro/load-year";
import { createTRPCRouter, protectedProcedure } from "@server/trpc/init";

const yearSchema = z.number().int().min(2000).max(2100);

export const professionalRouter = createTRPCRouter({
  /**
   * Mois proposés par le sélecteur (du plus récent au plus ancien) : les 12 mois de chaque année qui
   * a des données pro (relevé validé ou facturation) et de l'année en cours. Les mois à venir sont
   * inclus : ils affichent le prévisionnel.
   */
  periods: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [transactionYears, billingYears] = await Promise.all([
      ctx.db.transaction.groupBy({
        by: ["year"],
        where: validatedTransactions(userId, "PROFESSIONAL"),
      }),
      ctx.db.billingLine.groupBy({ by: ["year"], where: { userId } }),
    ]);
    const years = new Set([
      new Date().getFullYear(),
      ...transactionYears.map((row) => row.year),
      ...billingYears.map((row) => row.year),
    ]);
    return [...years]
      .sort((a, b) => b - a)
      .flatMap((year) => Array.from({ length: 12 }, (_, index) => ({ year, month: 12 - index })));
  }),

  /** Un mois : prévu et réel de chaque bloc (voir `computeMonth`) + ses transactions pro validées. */
  month: protectedProcedure
    .input(z.object({ year: yearSchema, month: z.number().int().min(1).max(12) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [months, transactions] = await Promise.all([
        loadProYear(ctx.db, userId, input.year),
        ctx.db.transaction.findMany({
          where: {
            ...validatedTransactions(userId, "PROFESSIONAL"),
            year: input.year,
            month: input.month,
          },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          select: { id: true, date: true, label: true, amountCents: true, category: true },
        }),
      ]);
      return { ...months[input.month - 1], transactions };
    }),

  /** Les 12 mois d'une année (vue année, et contexte du mois : TVA du mois précédent, cumuls). */
  year: protectedProcedure
    .input(z.object({ year: yearSchema }))
    .query(({ ctx, input }) => loadProYear(ctx.db, ctx.session.user.id, input.year)),
});

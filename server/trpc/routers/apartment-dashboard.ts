import { z } from "zod";

import { buildApartmentsView } from "@server/lib/apartments/build-view";
import { loadApartmentData } from "@server/lib/apartments/load-period";
import { currentYearMonth, isMonthClosed } from "@server/lib/apartments/period";
import { createTRPCRouter, protectedProcedure } from "@server/trpc/init";

const yearSchema = z.number().int().min(2000).max(2100);
const apartmentFilter = z.string().min(1).nullish();

export const apartmentDashboardRouter = createTRPCRouter({
  /** Mois proposés par le sélecteur (du plus récent au plus ancien) : les mois clos depuis la première acquisition (R1). */
  periods: protectedProcedure.query(async ({ ctx }) => {
    const first = await ctx.db.apartment.findFirst({
      where: { userId: ctx.session.user.id },
      orderBy: { acquiredAt: "asc" },
      select: { acquiredAt: true },
    });
    if (!first) return [];
    const now = currentYearMonth();
    const periods: { year: number; month: number }[] = [];
    for (
      let year = first.acquiredAt.getUTCFullYear(), month = first.acquiredAt.getUTCMonth() + 1;
      isMonthClosed({ year, month }, now);
      month === 12 ? ((month = 1), year++) : month++
    ) {
      periods.push({ year, month });
    }
    return periods.reverse();
  }),

  /** Un mois : prévu / réalisé / écart de chaque appartement actif, KPI et transactions rattachées. */
  month: protectedProcedure
    .input(
      z.object({
        year: yearSchema,
        month: z.number().int().min(1).max(12),
        apartmentId: apartmentFilter,
      }),
    )
    .query(async ({ ctx, input }) => {
      const data = await loadApartmentData(ctx.db, ctx.session.user.id, input.year);
      const view = buildApartmentsView(data, { ...input, apartmentId: input.apartmentId ?? null });
      const shown = new Set(view.apartments.map((apartment) => apartment.id));
      const names = new Map(data.apartments.map((apartment) => [apartment.id, apartment.name]));
      const transactions = data.transactions
        .filter((t) => t.year === input.year && t.month === input.month && shown.has(t.apartmentId))
        .map(({ year: _year, month: _month, ...t }) => ({
          ...t,
          apartmentName: names.get(t.apartmentId) ?? "",
          // Sans catégorie ou « Autres » : à reclasser si possible, comme ailleurs (R4).
          toCheck: t.category === null || t.category === "APT_OTHER",
        }));
      return { ...view, transactions };
    }),

  /** Une année : colonnes sur les mois clos, rendements (R9) et seuils LMNP (R10). */
  year: protectedProcedure
    .input(z.object({ year: yearSchema, apartmentId: apartmentFilter }))
    .query(async ({ ctx, input }) => {
      const data = await loadApartmentData(ctx.db, ctx.session.user.id, input.year);
      return buildApartmentsView(data, {
        year: input.year,
        month: null,
        apartmentId: input.apartmentId ?? null,
      });
    }),
});

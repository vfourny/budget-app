import { z } from "zod";

import { BillingKind } from "@server/generated/prisma/enums";
import { appError } from "@server/lib/app-error";
import { createTRPCRouter, protectedProcedure } from "@server/trpc/init";

const periodSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

const billingLineSchema = z.object({
  clientId: z.string().min(1),
  dailyRateCents: z.number().int().min(0).max(10_000_00),
  /** Demi-journées : 0 à 62 (31 jours). */
  halfDays: z.number().int().min(0).max(62),
});

/** Mois suivants de l'année (`month + 1` → 12). */
const followingMonths = (month: number) =>
  Array.from({ length: 12 - month }, (_, index) => month + 1 + index);

export const proForecastRouter = createTRPCRouter({
  /** Lignes de facturation d'un mois, prévues (`FORECAST`) ou réelles (`ACTUAL`). */
  billingLines: protectedProcedure
    .input(periodSchema.extend({ kind: z.enum(BillingKind) }))
    .query(({ ctx, input }) =>
      ctx.db.billingLine.findMany({
        where: { userId: ctx.session.user.id, ...input },
        orderBy: { id: "asc" },
        select: { id: true, clientId: true, dailyRateCents: true, halfDays: true },
      }),
    ),

  /** Remplace les lignes d'un mois (prévues ou réelles) en une seule transaction SQL. */
  setBillingLines: protectedProcedure
    .input(
      periodSchema.extend({ kind: z.enum(BillingKind), lines: z.array(billingLineSchema).max(50) }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { lines, ...where } = input;
      // Chaque client doit appartenir à l'utilisateur.
      const clientIds = [...new Set(lines.map((line) => line.clientId))];
      const owned = await ctx.db.client.count({ where: { userId, id: { in: clientIds } } });
      if (owned !== clientIds.length) throw appError("NOT_FOUND", "CLIENT_NOT_FOUND");

      await ctx.db.$transaction([
        ctx.db.billingLine.deleteMany({ where: { userId, ...where } }),
        ctx.db.billingLine.createMany({
          data: lines.map((line) => ({ ...line, ...where, userId })),
        }),
      ]);
      return { count: lines.length };
    }),

  /** « Appliquer aux mois suivants » : copie la facturation prévue du mois sur la fin de l'année. */
  copyBillingToFollowingMonths: protectedProcedure
    .input(periodSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const months = followingMonths(input.month);
      const source = await ctx.db.billingLine.findMany({
        where: { userId, year: input.year, month: input.month, kind: "FORECAST" },
        select: { clientId: true, dailyRateCents: true, halfDays: true },
      });
      await ctx.db.$transaction([
        ctx.db.billingLine.deleteMany({
          where: { userId, year: input.year, month: { in: months }, kind: "FORECAST" },
        }),
        ctx.db.billingLine.createMany({
          data: months.flatMap((month) =>
            source.map((line) => ({
              ...line,
              userId,
              year: input.year,
              month,
              kind: "FORECAST" as const,
            })),
          ),
        }),
      ]);
      return { months: months.length };
    }),
});

import { z } from "zod";

import { BUDGET_ENVELOPES, type BudgetEnvelope } from "@server/lib/settings/envelope-shares";
import { DEFAULT_ENVELOPE_PERCENTS } from "@/lib/budget-rules";
import { createTRPCRouter, protectedProcedure } from "@server/trpc/init";

const envelopeSharesSchema = z
  .object(
    Object.fromEntries(
      BUDGET_ENVELOPES.map((envelope) => [envelope, z.number().int().min(0).max(100)]),
    ) as Record<BudgetEnvelope, z.ZodNumber>,
  )
  .refine((shares) => Object.values(shares).reduce((sum, percent) => sum + percent, 0) === 100, {
    message: "Envelope shares must sum to exactly 100.",
  });

const incomeTaxBracketsSchema = z
  .array(
    z.object({
      fromCents: z.number().int().min(0),
      ratePercent: z.number().int().min(0).max(100),
    }),
  )
  .min(1)
  .refine(
    (brackets) =>
      brackets[0].fromCents === 0 &&
      brackets.every((b, i) => i === 0 || b.fromCents > brackets[i - 1].fromCents),
    { message: "Brackets must start at 0 and have strictly increasing thresholds." },
  );

export const settingsRouter = createTRPCRouter({
  /** Part du revenu recommandée par enveloppe (valeurs par défaut si jamais configurée). */
  envelopeShares: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.envelopeShare.findMany({ where: { userId: ctx.session.user.id } });
    const shares: Record<BudgetEnvelope, number> = { ...DEFAULT_ENVELOPE_PERCENTS };
    for (const row of rows) {
      if (row.envelope in shares) shares[row.envelope as BudgetEnvelope] = row.percent;
    }
    return shares;
  }),

  /** Enregistre les 5 parts d'un coup (une seule transaction SQL). */
  setEnvelopeShares: protectedProcedure
    .input(envelopeSharesSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await ctx.db.$transaction(
        BUDGET_ENVELOPES.map((envelope) =>
          ctx.db.envelopeShare.upsert({
            where: { userId_envelope: { userId, envelope } },
            create: { userId, envelope, percent: input[envelope] },
            update: { percent: input[envelope] },
          }),
        ),
      );
      return input;
    }),

  /** Barème de l'IR d'une année, trié par seuil ; tableau vide si jamais renseigné. */
  incomeTaxBrackets: protectedProcedure
    .input(z.object({ year: z.number().int() }))
    .query(({ ctx, input }) =>
      ctx.db.incomeTaxBracket.findMany({
        where: { year: input.year },
        orderBy: { fromCents: "asc" },
        select: { fromCents: true, ratePercent: true },
      }),
    ),

  /** Remplace le barème d'une année (suppression + création en une seule transaction SQL). */
  setIncomeTaxBrackets: protectedProcedure
    .input(z.object({ year: z.number().int(), brackets: incomeTaxBracketsSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction([
        ctx.db.incomeTaxBracket.deleteMany({ where: { year: input.year } }),
        ctx.db.incomeTaxBracket.createMany({
          data: input.brackets.map((bracket) => ({ year: input.year, ...bracket })),
        }),
      ]);
      return input;
    }),
});

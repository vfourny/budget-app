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

export const settingsRouter = createTRPCRouter({
  /** Part du revenu recommandée par enveloppe (valeurs par défaut si jamais configurée). */
  envelopeShares: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.envelopeShare.findMany();
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
      await ctx.db.$transaction(
        BUDGET_ENVELOPES.map((envelope) =>
          ctx.db.envelopeShare.upsert({
            where: { envelope },
            create: { envelope, percent: input[envelope] },
            update: { percent: input[envelope] },
          }),
        ),
      );
      return input;
    }),
});

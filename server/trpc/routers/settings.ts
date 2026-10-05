import { z } from "zod";

import { CompanyRegime } from "@server/generated/prisma/enums";
import { BUDGET_ENVELOPES, type BudgetEnvelope } from "@server/lib/settings/envelope-shares";
import { resolveProYearSettings } from "@server/lib/settings/pro-year-settings";
import { DEFAULT_ENVELOPE_PERCENTS } from "@shared/budget-rules";
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

const basisPoints = z.number().int().min(0).max(100_00);

/** Règles pro d'une année : entiers uniquement (centimes, points de base, dm², millièmes d'€). */
const proYearSettingsSchema = z
  .object({
    regime: z.enum(CompanyRegime),
    irOptionFirstYear: z.number().int().min(2000).max(2100),
    grossSalaryCents: z.number().int().min(0).max(100_000_00),
    employerContributionBp: basisPoints,
    employeeContributionBp: basisPoints,
    taxableNetBp: z.number().int().min(0).max(150_00),
    withholdingTaxBp: basisPoints,
    profitSocialChargesBp: basisPoints,
    officeAreaDm2: z.number().int().min(0).max(500_00),
    homeAreaDm2: z.number().int().min(1).max(1000_00),
    mixedKeyNumerator: z.number().int().min(0).max(31),
    mixedKeyDenominator: z.number().int().min(1).max(31),
    mileageRateMilli: z.number().int().min(0).max(5000),
  })
  .refine((values) => values.officeAreaDm2 <= values.homeAreaDm2, {
    message: "The office cannot be larger than the home.",
  })
  .refine((values) => values.mixedKeyNumerator <= values.mixedKeyDenominator, {
    message: "The mixed costs key cannot exceed 1.",
  });

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

  /**
   * Règles pro applicables à une année (Réglages › Pro, écran Pro) : celles de l'année, sinon
   * reprises de la dernière année configurée avant, sinon les valeurs par défaut.
   */
  proYear: protectedProcedure
    .input(z.object({ year: z.number().int() }))
    .query(({ ctx, input }) => resolveProYearSettings(ctx.db, ctx.session.user.id, input.year)),

  /** Années ayant des règles pro enregistrées (pastille « configuré » de Réglages). */
  proYearsConfigured: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.proYearSettings.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { year: "asc" },
      select: { year: true },
    });
    return rows.map((row) => row.year);
  }),

  /** Enregistre (crée ou remplace) les règles pro d'une année, sans toucher aux autres années. */
  setProYear: protectedProcedure
    .input(z.object({ year: z.number().int().min(2000).max(2100), values: proYearSettingsSchema }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await ctx.db.proYearSettings.upsert({
        where: { userId_year: { userId, year: input.year } },
        create: { userId, year: input.year, ...input.values },
        update: input.values,
      });
      return input;
    }),
});

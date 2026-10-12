import { CompanyRegime, type Envelope } from '@server/generated/prisma/enums'
import { BUDGET_ENVELOPES } from '@server/lib/settings/envelope-shares'
import { resolveProfessionalYearSettings } from '@server/lib/settings/professional-year-settings'
import { createTRPCRouter, protectedProcedure } from '@server/trpc/init'
import { DEFAULT_ENVELOPE_PERCENTS } from '@shared/personal-rules'
import { z } from 'zod'

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

const basisPoints = z.number().int().min(0).max(100_00)

/** Règles pro d'une année : entiers uniquement (centimes, points de base, dm², millièmes d'€). */
const professionalYearSettingsSchema = z
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
    mileageRateMilli: z.number().int().min(0).max(5000),
  })
  .refine((values) => values.officeAreaDm2 <= values.homeAreaDm2, {
    message: 'The office cannot be larger than the home.',
  })

export const settingsRouter = createTRPCRouter({
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

  /**
   * Règles pro applicables à une année (Réglages › Pro, écran Pro) : celles de l'année, sinon
   * reprises de la dernière année configurée avant, sinon les valeurs par défaut.
   */
  professionalYear: protectedProcedure
    .input(z.object({ year: z.number().int() }))
    .query(({ ctx, input }) =>
      resolveProfessionalYearSettings(ctx.db, ctx.session.user.id, input.year),
    ),

  /** Années ayant des règles pro enregistrées (pastille « configuré » de Réglages). */
  professionalYearsConfigured: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.professionalYearSettings.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { year: 'asc' },
      select: { year: true },
    })
    return rows.map((row) => row.year)
  }),

  /** Enregistre (crée ou remplace) les règles pro d'une année, sans toucher aux autres années. */
  setProfessionalYear: protectedProcedure
    .input(
      z.object({
        year: z.number().int().min(2000).max(2100),
        values: professionalYearSettingsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await ctx.db.professionalYearSettings.upsert({
        where: { userId_year: { userId, year: input.year } },
        create: { userId, year: input.year, ...input.values },
        update: input.values,
      })
      return input
    }),
})

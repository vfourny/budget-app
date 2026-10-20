import { CompanyRegime } from '@server/generated/prisma/enums'
import { resolveProfessionalYearSettings } from '@server/services/professional/year-settings.service'
import { createTRPCRouter, protectedProcedure } from '@server/trpc/trpc.config'
import { yearSchema } from '@shared/period.schema'
import { z } from 'zod'

const basisPoints = z.number().int().min(0).max(100_00)

/** Règles pro d'une année : entiers uniquement (centimes, points de base, dm², millièmes d'€). */
const professionalYearSettingsSchema = z
  .object({
    regime: z.enum(CompanyRegime),
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

/** Réglages › Pro : règles de calcul de chaque année (taux, surfaces, barème km). */
export const professionalSettingsRouter = createTRPCRouter({
  /**
   * Règles pro applicables à une année (Réglages › Pro, écran Pro) : celles de l'année, sinon
   * reprises de la dernière année configurée avant, sinon les valeurs par défaut.
   */
  year: protectedProcedure
    .input(z.object({ year: yearSchema }))
    .query(({ ctx, input }) =>
      resolveProfessionalYearSettings(ctx.db, ctx.session.user.id, input.year),
    ),

  /** Années ayant des règles pro enregistrées (pastille « configuré » de Réglages). */
  configuredYears: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.professionalYearSettings.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { year: 'asc' },
      select: { year: true },
    })
    return rows.map((row) => row.year)
  }),

  /** Enregistre (crée ou remplace) les règles pro d'une année, sans toucher aux autres années. */
  setYear: protectedProcedure
    .input(
      z.object({
        year: yearSchema,
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

import {
  BillingKind,
  TransactionCategory,
} from '@server/generated/prisma/enums'
import { appError } from '@server/lib/app-error.util'
import { forecastValues } from '@server/lib/professional/forecast-values.service'
import { createTRPCRouter, protectedProcedure } from '@server/trpc/trpc.config'
import { yearMonthSchema } from '@shared/period.schema'
import {
  DAY_STEP,
  MAX_BILLED_DAYS,
} from '@shared/professional/billing-days.util'
import {
  FORECAST_GROUPS,
  type ForecastGroup,
} from '@shared/professional/professional.rules'
import { followingMonthsOfYear } from '@shared/year-month.util'
import { z } from 'zod'

const billingLineSchema = z.object({
  /** Nom du client, en texte libre. */
  clientName: z.string().trim().min(1).max(80),
  dailyRateCents: z.number().int().min(0).max(10_000_00),
  /** Jours facturés, par demi-journée (1, 0,5…), voir `shared/professional/billing-days.util.ts`. */
  days: z.number().min(0).max(MAX_BILLED_DAYS).multipleOf(DAY_STEP),
})

const grossSalaryCents = z.number().int().min(0).max(100_000_00)

const groupSchema = z.enum(
  Object.keys(FORECAST_GROUPS) as [ForecastGroup, ...ForecastGroup[]],
)

/** La catégorie fait-elle partie du groupe (charges, frais mixtes) ? */
const inGroup = (group: ForecastGroup, category: TransactionCategory) =>
  FORECAST_GROUPS[group].categories.some((value) => value === category)

export const professionalForecastRouter = createTRPCRouter({
  /**
   * Clients déjà saisis (autocomplétion de l'éditeur), avec le TJM de leur ligne la plus récente
   * pour pré-remplir une nouvelle ligne.
   */
  clients: protectedProcedure.query(async ({ ctx }) => {
    const lines = await ctx.db.billingLine.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { kind: 'desc' }],
      distinct: ['clientName'],
      select: { clientName: true, dailyRateCents: true },
    })
    return lines
      .map((line) => ({
        name: line.clientName,
        lastDailyRateCents: line.dailyRateCents,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }),

  /** Lignes de facturation d'un mois, prévues (`FORECAST`) ou réelles (`ACTUAL`). */
  billingLines: protectedProcedure
    .input(yearMonthSchema.extend({ kind: z.enum(BillingKind) }))
    .query(({ ctx, input }) =>
      ctx.db.billingLine.findMany({
        where: { userId: ctx.session.user.id, ...input },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          clientName: true,
          dailyRateCents: true,
          days: true,
        },
      }),
    ),

  /** Remplace les lignes d'un mois (prévues ou réelles) en une seule transaction SQL. */
  setBillingLines: protectedProcedure
    .input(
      yearMonthSchema.extend({
        kind: z.enum(BillingKind),
        lines: z.array(billingLineSchema).max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const { lines, ...where } = input

      await ctx.db.$transaction([
        ctx.db.billingLine.deleteMany({ where: { userId, ...where } }),
        ctx.db.billingLine.createMany({
          data: lines.map((line) => ({ ...line, ...where, userId })),
        }),
      ])
      return { count: lines.length }
    }),

  /** « Appliquer aux mois suivants » : copie la facturation prévue du mois sur la fin de l'année. */
  copyBillingToFollowingMonths: protectedProcedure
    .input(yearMonthSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const months = followingMonthsOfYear(input.month)
      const source = await ctx.db.billingLine.findMany({
        where: {
          userId,
          year: input.year,
          month: input.month,
          kind: 'FORECAST',
        },
        select: { clientName: true, dailyRateCents: true, days: true },
      })
      await ctx.db.$transaction([
        ctx.db.billingLine.deleteMany({
          where: {
            userId,
            year: input.year,
            month: { in: months },
            kind: 'FORECAST',
          },
        }),
        ctx.db.billingLine.createMany({
          data: months.flatMap((month) =>
            source.map((line) => ({
              ...line,
              userId,
              year: input.year,
              month,
              kind: 'FORECAST' as const,
            })),
          ),
        }),
      ])
      return { months: months.length }
    }),

  /**
   * Montants prévus d'un groupe (charges pro + BNC, ou dépenses perso des frais mixtes) : saisie du
   * mois, valeur par défaut (réel N-1) et réel du mois précédent.
   */
  forecasts: protectedProcedure
    .input(yearMonthSchema.extend({ group: groupSchema }))
    .query(({ ctx, input }) =>
      forecastValues(
        ctx.db,
        ctx.session.user.id,
        input.group,
        input.year,
        input.month,
      ),
    ),

  /** Enregistre les montants d'un groupe ; `null` = revenir à la valeur par défaut (N-1). */
  setForecasts: protectedProcedure
    .input(
      yearMonthSchema.extend({
        group: groupSchema,
        values: z
          .array(
            z.object({
              category: z.enum(TransactionCategory),
              amountCents: z.number().int().min(0).max(1_000_000_00).nullable(),
            }),
          )
          .max(30),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const { year, month } = input
      if (input.values.some((value) => !inGroup(input.group, value.category))) {
        throw appError('BAD_REQUEST', 'CATEGORY_NOT_ALLOWED')
      }
      await ctx.db.$transaction(
        input.values.map(({ category, amountCents }) =>
          amountCents === null
            ? ctx.db.monthlyForecast.deleteMany({
                where: { userId, year, month, category },
              })
            : ctx.db.monthlyForecast.upsert({
                where: {
                  userId_year_month_category: { userId, year, month, category },
                },
                create: { userId, year, month, category, amountCents },
                update: { amountCents },
              }),
        ),
      )
      return { count: input.values.length }
    }),

  /**
   * « Appliquer aux mois suivants » : recopie les montants du mois (saisis, sinon par défaut) sur
   * la fin de l'année, en saisie (modifiable ensuite mois par mois).
   */
  copyForecastsToFollowingMonths: protectedProcedure
    .input(yearMonthSchema.extend({ group: groupSchema }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const values = await forecastValues(
        ctx.db,
        userId,
        input.group,
        input.year,
        input.month,
      )
      const months = followingMonthsOfYear(input.month)
      const categories = values.map((value) => value.category)
      await ctx.db.$transaction([
        ctx.db.monthlyForecast.deleteMany({
          where: {
            userId,
            year: input.year,
            month: { in: months },
            category: { in: categories },
          },
        }),
        ctx.db.monthlyForecast.createMany({
          data: months.flatMap((month) =>
            values.map((value) => ({
              userId,
              year: input.year,
              month,
              category: value.category,
              amountCents: value.overrideCents ?? value.lastYearCents,
            })),
          ),
        }),
      ])
      return { months: months.length }
    }),

  /** Salaire brut prévu d'un mois : saisie (`null` = défaut) et brut du même mois N-1. */
  salary: protectedProcedure
    .input(yearMonthSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const [override, lastYear] = await Promise.all([
        ctx.db.salaryForecast.findUnique({
          where: { userId_year_month: { userId, ...input } },
        }),
        ctx.db.salaryForecast.findUnique({
          where: {
            userId_year_month: {
              userId,
              year: input.year - 1,
              month: input.month,
            },
          },
        }),
      ])
      return {
        overrideCents: override?.grossSalaryCents ?? null,
        lastYearCents: lastYear?.grossSalaryCents ?? 0,
      }
    }),

  /** Enregistre le salaire brut prévu d'un mois ; `null` = revenir au brut N-1. */
  setSalary: protectedProcedure
    .input(
      yearMonthSchema.extend({ grossSalaryCents: grossSalaryCents.nullable() }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const { grossSalaryCents, ...period } = input
      if (grossSalaryCents === null) {
        await ctx.db.salaryForecast.deleteMany({
          where: { userId, ...period },
        })
      } else {
        await ctx.db.salaryForecast.upsert({
          where: { userId_year_month: { userId, ...period } },
          create: { userId, ...period, grossSalaryCents },
          update: { grossSalaryCents },
        })
      }
      return input
    }),

  /** « Appliquer aux mois suivants » : recopie le salaire brut du mois sur la fin de l'année. */
  copySalaryToFollowingMonths: protectedProcedure
    .input(yearMonthSchema.extend({ grossSalaryCents }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const months = followingMonthsOfYear(input.month)
      await ctx.db.$transaction([
        ctx.db.salaryForecast.deleteMany({
          where: { userId, year: input.year, month: { in: months } },
        }),
        ctx.db.salaryForecast.createMany({
          data: months.map((month) => ({
            userId,
            year: input.year,
            month,
            grossSalaryCents: input.grossSalaryCents,
          })),
        }),
      ])
      return { months: months.length }
    }),

  /** Km prévus d'un mois : saisie (`null` = défaut) et km réels (trajets) du même mois N-1. */
  mileage: protectedProcedure
    .input(yearMonthSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const [override, lastYear] = await Promise.all([
        ctx.db.mileageForecast.findUnique({
          where: { userId_year_month: { userId, ...input } },
        }),
        ctx.db.trip.aggregate({
          where: { userId, year: input.year - 1, month: input.month },
          _sum: { km: true },
        }),
      ])
      return {
        overrideKm: override?.km ?? null,
        lastYearKm: lastYear._sum.km ?? 0,
      }
    }),

  /** Enregistre les km prévus d'un mois ; `null` = revenir aux km N-1. */
  setMileage: protectedProcedure
    .input(
      yearMonthSchema.extend({
        km: z.number().int().min(0).max(100_000).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const { km, ...period } = input
      if (km === null) {
        await ctx.db.mileageForecast.deleteMany({
          where: { userId, ...period },
        })
      } else {
        await ctx.db.mileageForecast.upsert({
          where: { userId_year_month: { userId, ...period } },
          create: { userId, ...period, km },
          update: { km },
        })
      }
      return input
    }),

  /** « Appliquer aux mois suivants » : recopie les km prévus du mois sur la fin de l'année. */
  copyMileageToFollowingMonths: protectedProcedure
    .input(yearMonthSchema.extend({ km: z.number().int().min(0).max(100_000) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const months = followingMonthsOfYear(input.month)
      await ctx.db.$transaction([
        ctx.db.mileageForecast.deleteMany({
          where: { userId, year: input.year, month: { in: months } },
        }),
        ctx.db.mileageForecast.createMany({
          data: months.map((month) => ({
            userId,
            year: input.year,
            month,
            km: input.km,
          })),
        }),
      ])
      return { months: months.length }
    }),
})

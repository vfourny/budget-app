import {
  BillingKind,
  TransactionCategory,
} from '@server/generated/prisma/enums'
import {
  copyForecastAmountsToFollowingMonths,
  forecastAmounts,
  setForecastAmounts,
} from '@server/services/professional/forecast-amounts.service'
import {
  billingClients,
  copyBillingToFollowingMonths,
  setBillingLines,
} from '@server/services/professional/forecast-billing.service'
import {
  copyMileageToFollowingMonths,
  mileageForecast,
  setMileageForecast,
} from '@server/services/professional/forecast-mileage.service'
import {
  copySalaryToFollowingMonths,
  salaryForecast,
  setSalaryForecast,
} from '@server/services/professional/forecast-salary.service'
import type { ForecastScope } from '@server/services/professional/forecast-scope.util'
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
import type { YearMonth } from '@shared/year-month.util'
import { z } from 'zod'

const billingLineSchema = z.object({
  /** Nom du client, en texte libre. */
  clientName: z.string().trim().min(1).max(80),
  dailyRateCents: z.number().int().min(0).max(10_000_00),
  /** Jours facturés, par demi-journée (1, 0,5…), voir `shared/professional/billing-days.util.ts`. */
  days: z.number().min(0).max(MAX_BILLED_DAYS).multipleOf(DAY_STEP),
})
const grossSalaryCents = z.number().int().min(0).max(100_000_00)
const km = z.number().int().min(0).max(100_000)
const groupSchema = z.enum(
  Object.keys(FORECAST_GROUPS) as [ForecastGroup, ...ForecastGroup[]],
)

/** Clé des saisies du mois : l'utilisateur connecté + l'année et le mois demandés. */
const scopeOf = (
  userId: string,
  { year, month }: YearMonth,
): ForecastScope => ({
  userId,
  year,
  month,
})

/**
 * Éditeur du prévisionnel Pro, un groupe de procédures par onglet (facturation, montants des
 * charges / frais mixtes, salaire, km). Lecture, saisie (`null` = revenir au réel N-1) et
 * « Appliquer aux mois suivants » : la logique est dans `server/lib/professional/forecast-*.service.ts`.
 */
export const professionalForecastRouter = createTRPCRouter({
  // ── Facturation ──────────────────────────────────────────────────────────────────────────
  clients: protectedProcedure.query(({ ctx }) =>
    billingClients(ctx.db, ctx.session.user.id),
  ),

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

  setBillingLines: protectedProcedure
    .input(
      yearMonthSchema.extend({
        kind: z.enum(BillingKind),
        lines: z.array(billingLineSchema).max(50),
      }),
    )
    .mutation(({ ctx, input }) =>
      setBillingLines(
        ctx.db,
        scopeOf(ctx.session.user.id, input),
        input.kind,
        input.lines,
      ),
    ),

  copyBillingToFollowingMonths: protectedProcedure
    .input(yearMonthSchema)
    .mutation(({ ctx, input }) =>
      copyBillingToFollowingMonths(ctx.db, scopeOf(ctx.session.user.id, input)),
    ),

  // ── Montants d'un groupe (charges pro + BNC, dépenses perso des frais mixtes) ──────────
  forecasts: protectedProcedure
    .input(yearMonthSchema.extend({ group: groupSchema }))
    .query(({ ctx, input }) =>
      forecastAmounts(ctx.db, scopeOf(ctx.session.user.id, input), input.group),
    ),

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
    .mutation(({ ctx, input }) =>
      setForecastAmounts(
        ctx.db,
        scopeOf(ctx.session.user.id, input),
        input.group,
        input.values,
      ),
    ),

  copyForecastsToFollowingMonths: protectedProcedure
    .input(yearMonthSchema.extend({ group: groupSchema }))
    .mutation(({ ctx, input }) =>
      copyForecastAmountsToFollowingMonths(
        ctx.db,
        scopeOf(ctx.session.user.id, input),
        input.group,
      ),
    ),

  // ── Salaire brut ─────────────────────────────────────────────────────────────────────────
  salary: protectedProcedure
    .input(yearMonthSchema)
    .query(({ ctx, input }) =>
      salaryForecast(ctx.db, scopeOf(ctx.session.user.id, input)),
    ),

  setSalary: protectedProcedure
    .input(
      yearMonthSchema.extend({ grossSalaryCents: grossSalaryCents.nullable() }),
    )
    .mutation(async ({ ctx, input }) => {
      await setSalaryForecast(
        ctx.db,
        scopeOf(ctx.session.user.id, input),
        input.grossSalaryCents,
      )
      return input
    }),

  copySalaryToFollowingMonths: protectedProcedure
    .input(yearMonthSchema.extend({ grossSalaryCents }))
    .mutation(({ ctx, input }) =>
      copySalaryToFollowingMonths(
        ctx.db,
        scopeOf(ctx.session.user.id, input),
        input.grossSalaryCents,
      ),
    ),

  // ── Km ───────────────────────────────────────────────────────────────────────────────────
  mileage: protectedProcedure
    .input(yearMonthSchema)
    .query(({ ctx, input }) =>
      mileageForecast(ctx.db, scopeOf(ctx.session.user.id, input)),
    ),

  setMileage: protectedProcedure
    .input(yearMonthSchema.extend({ km: km.nullable() }))
    .mutation(async ({ ctx, input }) => {
      await setMileageForecast(
        ctx.db,
        scopeOf(ctx.session.user.id, input),
        input.km,
      )
      return input
    }),

  copyMileageToFollowingMonths: protectedProcedure
    .input(yearMonthSchema.extend({ km }))
    .mutation(({ ctx, input }) =>
      copyMileageToFollowingMonths(
        ctx.db,
        scopeOf(ctx.session.user.id, input),
        input.km,
      ),
    ),
})

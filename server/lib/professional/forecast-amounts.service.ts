import type { TransactionCategory } from '@server/generated/prisma/enums'
import { appError } from '@server/lib/app-error.util'
import type { db as Db } from '@server/lib/db.client'
import {
  followingMonthsScope,
  type ForecastScope,
  sameMonthLastYear,
} from '@server/lib/professional/forecast-scope.util'
import { validatedTransactions } from '@server/lib/transactions/scope.service'
import { previousMonth } from '@shared/common/year-month.util'
import { htFromTtc } from '@shared/professional/amounts.util'
import {
  FORECAST_GROUPS,
  type ForecastGroup,
  PROFESSIONAL_CHARGE_VAT_BP,
} from '@shared/professional/professional.rules'

export interface ForecastValue {
  category: TransactionCategory
  /** Valeur par défaut : réel du même mois l'année précédente. */
  lastYearCents: number
  /** Montant saisi pour le mois, `null` = valeur par défaut. */
  overrideCents: number | null
  /** Réel du mois précédent (repère dans l'éditeur). */
  previousMonthCents: number
}

/** Débits validés d'un mois par catégorie (positifs ; HT pour les charges pro). */
async function debits(
  db: typeof Db,
  { userId, year, month }: ForecastScope,
  group: ForecastGroup,
): Promise<Map<TransactionCategory, number>> {
  const { accountType, categories } = FORECAST_GROUPS[group]
  const rows = await db.transaction.groupBy({
    by: ['category'],
    where: {
      ...validatedTransactions(userId, accountType),
      year,
      month,
      amountCents: { lt: 0 },
      category: { in: [...categories] },
    },
    _sum: { amountCents: true },
  })
  return new Map(
    rows.flatMap((row) => {
      if (!row.category) return []
      const ttc = -(row._sum.amountCents ?? 0)
      const vatBp = (
        PROFESSIONAL_CHARGE_VAT_BP as Partial<
          Record<TransactionCategory, number>
        >
      )[row.category]
      return [
        [
          row.category,
          vatBp === undefined ? ttc : htFromTtc(ttc, vatBp),
        ] as const,
      ]
    }),
  )
}

export interface ForecastAmountInput {
  /** Montant saisi ; `null` = revenir à la valeur par défaut (réel N-1). */
  amountCents: number | null
  category: TransactionCategory
}

/**
 * Montants d'un groupe de l'éditeur (charges pro + BNC, ou dépenses perso des frais mixtes) pour un
 * mois : saisie, défaut (réel N-1) et réel du mois précédent.
 */
export async function forecastAmounts(
  db: typeof Db,
  scope: ForecastScope,
  group: ForecastGroup,
): Promise<ForecastValue[]> {
  const categories = FORECAST_GROUPS[group].categories
  const [overrides, lastYear, previous] = await Promise.all([
    db.monthlyForecast.findMany({
      where: { ...scope, category: { in: [...categories] } },
    }),
    debits(db, sameMonthLastYear(scope), group),
    debits(db, { ...scope, ...previousMonth(scope) }, group),
  ])
  return categories.map((category) => ({
    category,
    overrideCents:
      overrides.find((row) => row.category === category)?.amountCents ?? null,
    lastYearCents: lastYear.get(category) ?? 0,
    previousMonthCents: previous.get(category) ?? 0,
  }))
}

/** Enregistre les montants d'un groupe ; refusé si une catégorie n'appartient pas au groupe. */
export async function setForecastAmounts(
  db: typeof Db,
  scope: ForecastScope,
  group: ForecastGroup,
  values: readonly ForecastAmountInput[],
) {
  const { categories } = FORECAST_GROUPS[group]
  const inGroup = (category: TransactionCategory) =>
    categories.some((value) => value === category)
  if (values.some((value) => !inGroup(value.category))) {
    throw appError('BAD_REQUEST', 'CATEGORY_NOT_ALLOWED')
  }
  await db.$transaction(
    values.map(({ category, amountCents }) =>
      amountCents === null
        ? db.monthlyForecast.deleteMany({ where: { ...scope, category } })
        : db.monthlyForecast.upsert({
            where: { userId_year_month_category: { ...scope, category } },
            create: { ...scope, category, amountCents },
            update: { amountCents },
          }),
    ),
  )
  return { count: values.length }
}

/**
 * Recopie les montants du mois (saisis, sinon par défaut) sur les mois suivants de l'année, en
 * saisie (modifiable ensuite mois par mois).
 */
export async function copyForecastAmountsToFollowingMonths(
  db: typeof Db,
  scope: ForecastScope,
  group: ForecastGroup,
) {
  const values = await forecastAmounts(db, scope, group)
  const { months, where } = followingMonthsScope(scope)
  await db.$transaction([
    db.monthlyForecast.deleteMany({
      where: { ...where, category: { in: values.map((v) => v.category) } },
    }),
    db.monthlyForecast.createMany({
      data: months.flatMap((month) =>
        values.map((value) => ({
          ...scope,
          month,
          category: value.category,
          amountCents: value.overrideCents ?? value.lastYearCents,
        })),
      ),
    }),
  ])
  return { months: months.length }
}

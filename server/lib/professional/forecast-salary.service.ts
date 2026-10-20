import type { db as Db } from '@server/lib/db.client'
import {
  followingMonthsScope,
  type ForecastScope,
  sameMonthLastYear,
} from '@server/lib/professional/forecast-scope.util'

/** Salaire brut prévu d'un mois : saisie (`null` = défaut) et brut du même mois N-1. */
export async function salaryForecast(db: typeof Db, scope: ForecastScope) {
  const [override, lastYear] = await Promise.all([
    db.salaryForecast.findUnique({ where: { userId_year_month: scope } }),
    db.salaryForecast.findUnique({
      where: { userId_year_month: sameMonthLastYear(scope) },
    }),
  ])
  return {
    overrideCents: override?.grossSalaryCents ?? null,
    lastYearCents: lastYear?.grossSalaryCents ?? 0,
  }
}

/** Enregistre le salaire brut prévu d'un mois ; `null` = revenir au brut N-1. */
export async function setSalaryForecast(
  db: typeof Db,
  scope: ForecastScope,
  grossSalaryCents: number | null,
) {
  if (grossSalaryCents === null) {
    await db.salaryForecast.deleteMany({ where: scope })
    return
  }
  await db.salaryForecast.upsert({
    where: { userId_year_month: scope },
    create: { ...scope, grossSalaryCents },
    update: { grossSalaryCents },
  })
}

/** Recopie le salaire brut du mois sur les mois suivants de l'année. */
export async function copySalaryToFollowingMonths(
  db: typeof Db,
  scope: ForecastScope,
  grossSalaryCents: number,
) {
  const { months, where } = followingMonthsScope(scope)
  await db.$transaction([
    db.salaryForecast.deleteMany({ where }),
    db.salaryForecast.createMany({
      data: months.map((month) => ({ ...scope, month, grossSalaryCents })),
    }),
  ])
  return { months: months.length }
}

import type { db as Db } from '@server/utils/db.client'
import {
  followingMonthsScope,
  type ForecastScope,
  sameMonthLastYear,
} from '@server/services/professional/forecast-scope.util'

/** Km prévus d'un mois : saisie (`null` = défaut) et km réels (trajets) du même mois N-1. */
export async function mileageForecast(db: typeof Db, scope: ForecastScope) {
  const [override, lastYear] = await Promise.all([
    db.mileageForecast.findUnique({ where: { userId_year_month: scope } }),
    db.trip.aggregate({ where: sameMonthLastYear(scope), _sum: { km: true } }),
  ])
  return {
    overrideKm: override?.km ?? null,
    lastYearKm: lastYear._sum.km ?? 0,
  }
}

/** Enregistre les km prévus d'un mois ; `null` = revenir aux km N-1. */
export async function setMileageForecast(
  db: typeof Db,
  scope: ForecastScope,
  km: number | null,
) {
  if (km === null) {
    await db.mileageForecast.deleteMany({ where: scope })
    return
  }
  await db.mileageForecast.upsert({
    where: { userId_year_month: scope },
    create: { ...scope, km },
    update: { km },
  })
}

/** Recopie les km prévus du mois sur les mois suivants de l'année. */
export async function copyMileageToFollowingMonths(
  db: typeof Db,
  scope: ForecastScope,
  km: number,
) {
  const { months, where } = followingMonthsScope(scope)
  await db.$transaction([
    db.mileageForecast.deleteMany({ where }),
    db.mileageForecast.createMany({
      data: months.map((month) => ({ ...scope, month, km })),
    }),
  ])
  return { months: months.length }
}

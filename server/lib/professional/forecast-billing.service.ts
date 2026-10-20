import type { BillingKind } from '@server/generated/prisma/enums'
import type { db as Db } from '@server/lib/db.client'
import {
  followingMonthsScope,
  type ForecastScope,
} from '@server/lib/professional/forecast-scope.util'

export interface BillingLineInput {
  clientName: string
  dailyRateCents: number
  days: number
}

/** Clients déjà saisis, avec le TJM de leur ligne la plus récente (autocomplétion de l'éditeur). */
export async function billingClients(db: typeof Db, userId: string) {
  const lines = await db.billingLine.findMany({
    where: { userId },
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
}

/** Remplace les lignes d'un mois (prévues ou réelles) en une seule transaction SQL. */
export async function setBillingLines(
  db: typeof Db,
  scope: ForecastScope,
  kind: BillingKind,
  lines: readonly BillingLineInput[],
) {
  const where = { ...scope, kind }
  await db.$transaction([
    db.billingLine.deleteMany({ where }),
    db.billingLine.createMany({
      data: lines.map((line) => ({ ...line, ...where })),
    }),
  ])
  return { count: lines.length }
}

/** Copie la facturation prévue du mois sur les mois suivants de l'année. */
export async function copyBillingToFollowingMonths(
  db: typeof Db,
  scope: ForecastScope,
) {
  const { months, where } = followingMonthsScope(scope)
  const source = await db.billingLine.findMany({
    where: { ...scope, kind: 'FORECAST' },
    select: { clientName: true, dailyRateCents: true, days: true },
  })
  await db.$transaction([
    db.billingLine.deleteMany({ where: { ...where, kind: 'FORECAST' } }),
    db.billingLine.createMany({
      data: months.flatMap((month) =>
        source.map((line) => ({
          ...line,
          ...scope,
          month,
          kind: 'FORECAST' as const,
        })),
      ),
    }),
  ])
  return { months: months.length }
}

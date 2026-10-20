import { db } from '@server/utils/db.client'

import { SEED_YEAR } from './seed-year.config'

/**
 * Facturation Pro de départ (données de dev local) : un client, tous les jours ouvrés du mois
 * (lundi → vendredi, fériés ignorés), en prévu et en réel sur toute l'année `SEED_YEAR`.
 */
const PROFESSIONAL_BILLING_SEED = {
  year: SEED_YEAR,
  clientName: 'Davidson',
  forecastDailyRateCents: 40_000,
  actualDailyRateCents: 45_000,
} as const

/** Nombre de jours lundi → vendredi du mois (`month` de 1 à 12). Les fériés ne sont pas retirés. */
function weekdaysInMonth(year: number, month: number) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  let count = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const weekDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    if (weekDay !== 0 && weekDay !== 6) count++
  }
  return count
}

/** Un mois (et un type prévu / réel) qui a déjà des lignes n'est jamais touché : les saisies de l'éditeur restent. */
export async function seedProfessionalBilling(userId: string) {
  const seed = PROFESSIONAL_BILLING_SEED
  const kinds = [
    {
      kind: 'FORECAST',
      dailyRateCents: seed.forecastDailyRateCents,
      lastMonth: 12,
    },
    {
      kind: 'ACTUAL',
      dailyRateCents: seed.actualDailyRateCents,
      lastMonth: 12,
    },
  ] as const

  let created = 0
  for (const { kind, dailyRateCents, lastMonth } of kinds) {
    const filled = await db.billingLine.findMany({
      where: { userId, year: seed.year, kind },
      distinct: ['month'],
      select: { month: true },
    })
    const months = Array.from(
      { length: lastMonth },
      (_, index) => index + 1,
    ).filter((month) => !filled.some((line) => line.month === month))
    const { count } = await db.billingLine.createMany({
      data: months.map((month) => ({
        userId,
        year: seed.year,
        month,
        kind,
        clientName: seed.clientName,
        dailyRateCents,
        days: weekdaysInMonth(seed.year, month),
      })),
    })
    created += count
  }
  process.stdout.write(
    `Facturation Pro ${seed.year} : ${created} ligne(s) créée(s)` + '\n',
  )
}

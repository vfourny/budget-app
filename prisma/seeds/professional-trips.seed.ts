import { db } from '@server/lib/db.client'

import { SEED_YEAR } from './seed-year.config'

/**
 * Journal des trajets Pro de départ (données de dev local) sur toute l'année `SEED_YEAR` :
 * deux allers-retours chez le client chaque mois, et un rendez-vous chez le comptable par trimestre.
 */
const MONTHLY_TRIPS = [
  {
    day: 6,
    route: 'Domicile → Davidson (Blagnac) A/R',
    reason: 'Réunion client',
    km: 36,
  },
  {
    day: 20,
    route: 'Domicile → Davidson (Blagnac) A/R',
    reason: 'Atelier de cadrage',
    km: 36,
  },
] as const

const QUARTERLY_TRIP = {
  day: 14,
  route: 'Domicile → Cabinet comptable (Toulouse) A/R',
  reason: 'Rendez-vous comptable',
  km: 22,
} as const

/** Mois de début de trimestre (rendez-vous comptable). */
const QUARTER_MONTHS = [1, 4, 7, 10] as const

/** Un mois qui a déjà des trajets n'est jamais touché : les saisies du journal restent. */
export async function seedProfessionalTrips(userId: string) {
  const year = SEED_YEAR
  const filled = await db.trip.findMany({
    where: { userId, year },
    distinct: ['month'],
    select: { month: true },
  })

  const data = []
  for (let month = 1; month <= 12; month++) {
    if (filled.some((trip) => trip.month === month)) continue
    const trips = QUARTER_MONTHS.some((quarter) => quarter === month)
      ? [...MONTHLY_TRIPS, QUARTERLY_TRIP]
      : MONTHLY_TRIPS
    for (const { day, ...trip } of trips) {
      const date = new Date(Date.UTC(year, month - 1, day))
      data.push({ ...trip, userId, date, year, month })
    }
  }

  const { count } = await db.trip.createMany({ data })
  process.stdout.write(`Trajets Pro ${year} : ${count} créé(s)` + '\n')
}

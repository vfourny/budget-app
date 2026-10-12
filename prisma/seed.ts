import 'dotenv/config'

import { db } from '@server/lib/db'

import { seedApartments } from './seeds/apartments'
import { seedCsvFormats } from './seeds/csv-formats'
import { seedProfessionalBilling } from './seeds/professional-billing'
import { seedProfessionalTrips } from './seeds/professional-trips'
import { seedUser } from './seeds/user'

// Seed : lancé automatiquement par `pnpm db:reset` (prisma migrate reset) ou à la main avec
// `pnpm db:seed` (à relancer sur chaque base, develop et production). Chaque domaine a son fichier
// dans `prisma/seeds/`, idempotent : relancer le seed ne crée pas de doublon et n'écrase pas les
// saisies faites dans l'app.

try {
  const userId = await seedUser()
  await seedCsvFormats(userId)
  await seedProfessionalBilling(userId)
  await seedProfessionalTrips(userId)
  await seedApartments(userId)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await db.$disconnect()
}

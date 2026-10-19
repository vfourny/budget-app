import 'dotenv/config'

import { db } from '@server/lib/db.client'

import {
  seedApartments,
  seedToulouseStatements2025,
} from './seeds/apartments.seed'
import { seedCsvFormats } from './seeds/csv-formats.seed'
import { seedPersonal2025 } from './seeds/personal-2025.seed'
import { seedProfessionalBilling } from './seeds/professional-billing.seed'
import { seedProfessionalTrips } from './seeds/professional-trips.seed'
import { seedUser } from './seeds/user.seed'

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
  await seedToulouseStatements2025(userId)
  await seedPersonal2025(userId)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await db.$disconnect()
}

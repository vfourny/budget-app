import { AccountType } from '@server/generated/prisma/enums'
import { appError } from '@server/lib/app-error.util'
import { findCsvFormat } from '@server/lib/csv/find-format.service'
import { csvFingerprint } from '@server/lib/csv/fingerprint.util'
import type { db as Db } from '@server/lib/db.client'
import { findOwnedApartment } from '@server/lib/ownership.service'
import { csvFormatConfigSchema } from '@shared/transactions/csv-format.schema'
import { removeAlreadyImported } from '@shared/transactions/dedupe.calc'
import { parseBankStatement } from '@shared/transactions/parse-bank-statement.calc'
import { z } from 'zod'

/** Le CSV voyage en texte dans le JSON : un relevé fait quelques centaines de lignes, loin de la
 * limite Vercel (4,5 Mo). */
export const createImportInputSchema = z.object({
  accountType: z.enum(AccountType),
  /** Appartement du relevé : obligatoire pour un compte appartement, ignoré sinon (R11). */
  apartmentId: z.string().min(1).nullish(),
  fileName: z.string().min(1).max(255),
  csvText: z.string().min(1).max(2_000_000),
  /** Format confirmé par l'utilisateur après détection : enregistré (pour les prochains fichiers
   * de la même banque) une fois le fichier lu avec succès. */
  format: z
    .object({
      name: z.string().trim().min(1).max(60),
      config: csvFormatConfigSchema,
    })
    .optional(),
})

/**
 * Parse un relevé CSV et l'enregistre : un `ImportBatch` (PENDING_REVIEW) + ses `Transaction`
 * sans catégorie. Les lignes illisibles ne bloquent pas l'import : elles sont renvoyées pour que
 * l'UI les signale.
 */
export async function importStatement(
  db: typeof Db,
  userId: string,
  input: z.infer<typeof createImportInputSchema>,
) {
  // Un relevé appartement est rattaché à un bien de l'utilisateur ; les autres comptes n'en ont pas.
  let apartmentId: string | null = null
  if (input.accountType === 'APARTMENT') {
    if (!input.apartmentId) throw appError('BAD_REQUEST', 'APARTMENT_REQUIRED')
    apartmentId = (await findOwnedApartment(db, userId, input.apartmentId)).id
  }

  // Le format des colonnes se retrouve par l'empreinte de l'en-tête, pas par la banque. Un format
  // tout juste confirmé après détection prime sur celui (éventuel) déjà enregistré.
  const config =
    input.format?.config ?? (await findCsvFormat(userId, input.csvText, db))
  if (!config) throw appError('BAD_REQUEST', 'UNKNOWN_CSV_FORMAT')

  const { transactions, errors } = parseBankStatement(input.csvText, config)
  if (transactions.length === 0) {
    throw appError('BAD_REQUEST', 'NO_READABLE_TRANSACTIONS')
  }

  // Le mapping a produit des lignes lisibles : on le retient pour les prochains fichiers.
  if (input.format) {
    const fingerprint = csvFingerprint(input.csvText)
    await db.csvFormat.upsert({
      where: { userId_fingerprint: { userId, fingerprint } },
      create: {
        userId,
        fingerprint,
        name: input.format.name,
        config: input.format.config,
      },
      update: { name: input.format.name, config: input.format.config },
    })
  }

  // Relevés qui se chevauchent : on n'importe pas deux fois la même ligne.
  const times = transactions.map((transaction) => transaction.date.getTime())
  const existing = await db.transaction.findMany({
    where: {
      userId,
      accountType: input.accountType,
      date: {
        gte: new Date(Math.min(...times)),
        lte: new Date(Math.max(...times)),
      },
    },
    select: { date: true, amountCents: true, label: true },
  })
  const { fresh, duplicateCount } = removeAlreadyImported(
    transactions,
    existing,
  )
  if (fresh.length === 0) {
    throw appError('BAD_REQUEST', 'ALL_ROWS_ALREADY_IMPORTED')
  }

  // Une seule transaction SQL : un import est écrit en entier ou pas du tout.
  const batch = await db.importBatch.create({
    data: {
      userId,
      accountType: input.accountType,
      apartmentId,
      fileName: input.fileName,
      transactions: {
        createMany: {
          data: fresh.map((transaction) => ({
            ...transaction,
            userId,
            accountType: input.accountType,
            apartmentId,
          })),
        },
      },
    },
    select: { id: true },
  })

  // Les lignes illisibles ne bloquent pas l'import : on les renvoie pour que l'UI les signale.
  return {
    batchId: batch.id,
    importedCount: fresh.length,
    duplicateCount,
    errors,
  }
}

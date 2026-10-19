import { appError } from '@server/lib/app-error.util'
import type { db as Db } from '@server/lib/db.client'

/*
 * Accès aux données d'un utilisateur : une donnée d'un autre compte est « introuvable », jamais
 * « interdite » (on ne révèle pas qu'elle existe). Chaque fonction lève l'erreur métier attendue
 * par le front, pour que les routeurs n'aient plus qu'à l'appeler.
 */

type Database = typeof Db

/** Appartement de l'utilisateur, sinon `APARTMENT_NOT_FOUND`. */
export async function findOwnedApartment(
  db: Database,
  userId: string,
  id: string,
) {
  const apartment = await db.apartment.findFirst({
    where: { id, userId },
    select: { id: true, managed: true },
  })
  if (!apartment) throw appError('NOT_FOUND', 'APARTMENT_NOT_FOUND')
  return apartment
}

/** Import de l'utilisateur encore en relecture, sinon `IMPORT_NOT_FOUND` / `IMPORT_ALREADY_VALIDATED`. */
export async function findPendingImport(
  db: Database,
  userId: string,
  id: string,
) {
  const batch = await db.importBatch.findFirst({
    where: { id, userId },
    select: { id: true, accountType: true, status: true },
  })
  if (!batch) throw appError('NOT_FOUND', 'IMPORT_NOT_FOUND')
  if (batch.status === 'VALIDATED') {
    throw appError('BAD_REQUEST', 'IMPORT_ALREADY_VALIDATED')
  }
  return batch
}

/**
 * Transaction de l'utilisateur encore modifiable (import en relecture), sinon
 * `TRANSACTION_NOT_FOUND` / `IMPORT_ALREADY_VALIDATED`.
 */
export async function findEditableTransaction(
  db: Database,
  userId: string,
  id: string,
) {
  const transaction = await db.transaction.findFirst({
    where: { id, userId },
    select: { accountType: true, importBatch: { select: { status: true } } },
  })
  if (!transaction) throw appError('NOT_FOUND', 'TRANSACTION_NOT_FOUND')
  if (transaction.importBatch?.status === 'VALIDATED') {
    throw appError('BAD_REQUEST', 'IMPORT_ALREADY_VALIDATED')
  }
  return transaction
}

import { appError } from '@server/lib/app-error.util'
import type { db as Db } from '@server/lib/db.client'
import { matchLoanTransaction } from '@shared/apartments/loan.util'
import { needsReview } from '@shared/transactions/categories.rules'

/**
 * Un import et ses lignes (ordre du relevé), pour l'écran de relecture : « à vérifier » par ligne et,
 * pour un relevé appartement, rapprochement des échéances de prêt avec le tableau d'amortissement (R7).
 */
export async function loadImportReview(
  db: typeof Db,
  userId: string,
  id: string,
) {
  const batch = await db.importBatch.findFirst({
    where: { id: id, userId: userId },
    select: {
      id: true,
      fileName: true,
      status: true,
      createdAt: true,
      accountType: true,
      transactions: {
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          date: true,
          label: true,
          amountCents: true,
          category: true,
          categoryConfidence: true,
          apartmentId: true,
          year: true,
          month: true,
        },
      },
    },
  })
  if (!batch) throw appError('NOT_FOUND', 'IMPORT_NOT_FOUND')

  // Échéances de prêt d'un relevé appartement : comparées au tableau d'amortissement (R7).
  const apartments =
    batch.accountType === 'APARTMENT'
      ? await db.apartment.findMany({
          where: { userId: userId },
        })
      : []

  return {
    id: batch.id,
    fileName: batch.fileName,
    status: batch.status,
    createdAt: batch.createdAt,
    accountType: batch.accountType,
    transactions: batch.transactions.map(({ year, month, ...transaction }) => {
      const apartment = apartments.find(
        (candidate) => candidate.id === transaction.apartmentId,
      )
      return {
        ...transaction,
        needsReview: needsReview(transaction),
        loanMatch:
          apartment && transaction.category === 'APT_LOAN_REPAYMENT'
            ? matchLoanTransaction(apartment, {
                year,
                month,
                amountCents: transaction.amountCents,
              })
            : null,
      }
    }),
  }
}

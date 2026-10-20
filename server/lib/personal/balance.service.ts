import type { db as Db } from '@server/lib/db.client'
import { validatedTransactions } from '@server/lib/transactions/scope.service'
import { balanceAtEndOf } from '@shared/personal/balance.calc'
import { previousMonth } from '@shared/year-month.util'

/**
 * Solde du compte perso en début et fin de période (mois, ou année si `month` est absent) : calculé
 * depuis le repère saisi le plus récent (`AccountBalance`), `null` sans repère.
 */
export async function loadPersonalBalance(
  db: typeof Db,
  userId: string,
  input: { year: number; month?: number },
) {
  const [anchors, nets] = await Promise.all([
    db.accountBalance.findMany({
      where: { userId, accountType: 'PERSONAL' },
      select: { year: true, month: true, balanceCents: true },
    }),
    db.transaction.groupBy({
      by: ['year', 'month'],
      where: validatedTransactions(userId, 'PERSONAL'),
      _sum: { amountCents: true },
    }),
  ])
  const monthNets = nets.map((net) => ({
    year: net.year,
    month: net.month,
    cents: net._sum.amountCents ?? 0,
  }))
  const first = { year: input.year, month: input.month ?? 1 }
  const last = { year: input.year, month: input.month ?? 12 }

  return {
    /** Début de période = fin du mois précédent (c'est ce repère qu'on corrige). */
    opening: balanceAtEndOf(previousMonth(first), anchors, monthNets),
    closing: balanceAtEndOf(last, anchors, monthNets),
  }
}

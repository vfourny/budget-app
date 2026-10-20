import type { Prisma } from '@server/generated/prisma/client'
import { LOW_CONFIDENCE_THRESHOLD } from '@shared/transactions/categories.rules'

/**
 * Filtre Prisma des lignes « à vérifier » : même règle que `needsReview`
 * (`shared/transactions/categories.rules.ts`), appliquée en base.
 */
export const NEEDS_REVIEW_WHERE = {
  OR: [
    { category: null },
    { categoryConfidence: { lt: LOW_CONFIDENCE_THRESHOLD } },
  ],
} as const satisfies Prisma.TransactionWhereInput

import type { Prisma } from "@server/generated/prisma/client";
import { LOW_CONFIDENCE_THRESHOLD } from "@server/lib/categorize/categorize-transactions";

/**
 * Filtre Prisma des lignes « à vérifier » : sans catégorie, ou proposée par l'IA avec une
 * confiance faible. Une catégorie choisie à la main a `categoryConfidence = null` : « Confirmée ».
 */
export const NEEDS_REVIEW_WHERE = {
  OR: [{ category: null }, { categoryConfidence: { lt: LOW_CONFIDENCE_THRESHOLD } }],
} as const satisfies Prisma.TransactionWhereInput;

export function needsReview(transaction: {
  category: unknown;
  categoryConfidence: number | null;
}): boolean {
  return (
    transaction.category === null ||
    (transaction.categoryConfidence !== null &&
      transaction.categoryConfidence < LOW_CONFIDENCE_THRESHOLD)
  );
}

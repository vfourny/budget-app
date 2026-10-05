import type { AccountType } from "@server/generated/prisma/enums";
import type { db as Db } from "@server/lib/db";

/**
 * Filtre Prisma des transactions qui comptent dans un dashboard : celles de l'utilisateur, du type
 * de compte demandé, issues d'un import VALIDATED (une relecture en cours ne compte pas).
 */
export function validatedTransactions(userId: string, accountType: AccountType) {
  return { userId, accountType, importBatch: { status: "VALIDATED" } } as const;
}

/** Mois ayant des transactions validées (du plus récent au plus ancien). */
export async function periodsWithData(db: typeof Db, userId: string, accountType: AccountType) {
  const periods = await db.transaction.groupBy({
    by: ["year", "month"],
    where: validatedTransactions(userId, accountType),
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return periods.map(({ year, month }) => ({ year, month }));
}

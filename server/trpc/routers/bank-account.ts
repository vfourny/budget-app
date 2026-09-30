import { createTRPCRouter, publicProcedure } from "@server/trpc/init";

export const bankAccountRouter = createTRPCRouter({
  /** Comptes disponibles pour l'import (le formulaire d'upload en a besoin pour le select). */
  list: publicProcedure.query(({ ctx }) =>
    ctx.db.bankAccount.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, bank: true },
    }),
  ),
});

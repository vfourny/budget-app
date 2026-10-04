import { z } from "zod";

import { TransactionCategory } from "@server/generated/prisma/enums";
import { appError } from "@server/lib/app-error";
import { createTRPCRouter, publicProcedure } from "@server/trpc/init";

export const transactionRouter = createTRPCRouter({
  /**
   * Correction manuelle d'une catégorie à la relecture. `categoryConfidence` repasse à `null` :
   * catégorie choisie par l'utilisateur = « Confirmée » (plus « à vérifier »). Refusé une fois
   * l'import validé.
   */
  setCategory: publicProcedure
    .input(z.object({ id: z.string().min(1), category: z.enum(TransactionCategory) }))
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.db.transaction.findUnique({
        where: { id: input.id },
        select: { importBatch: { select: { status: true } } },
      });
      if (!transaction) {
        throw appError("NOT_FOUND", "TRANSACTION_NOT_FOUND");
      }
      if (transaction.importBatch?.status === "VALIDATED") {
        throw appError("BAD_REQUEST", "IMPORT_ALREADY_VALIDATED");
      }
      await ctx.db.transaction.update({
        where: { id: input.id },
        data: { category: input.category, categoryConfidence: null },
      });
      return { id: input.id };
    }),
});

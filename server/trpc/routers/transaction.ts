import { z } from "zod";

import { TransactionCategory } from "@server/generated/prisma/enums";
import { appError } from "@server/lib/app-error";
import { isCategoryOf } from "@shared/account-categories";
import { createTRPCRouter, protectedProcedure } from "@server/trpc/init";

export const transactionRouter = createTRPCRouter({
  /**
   * Correction manuelle d'une catégorie à la relecture. `categoryConfidence` repasse à `null` :
   * catégorie choisie par l'utilisateur = « Confirmée » (plus « à vérifier »). Refusé une fois
   * l'import validé.
   */
  setCategory: protectedProcedure
    .input(z.object({ id: z.string().min(1), category: z.enum(TransactionCategory) }))
    .mutation(async ({ ctx, input }) => {
      // Filtré sur l'utilisateur : la transaction d'un autre compte = « introuvable ».
      const transaction = await ctx.db.transaction.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: { accountType: true, importBatch: { select: { status: true } } },
      });
      if (!transaction) {
        throw appError("NOT_FOUND", "TRANSACTION_NOT_FOUND");
      }
      if (transaction.importBatch?.status === "VALIDATED") {
        throw appError("BAD_REQUEST", "IMPORT_ALREADY_VALIDATED");
      }
      // Une catégorie pro sur une ligne perso (ou l'inverse) fausserait les deux dashboards.
      if (!isCategoryOf(transaction.accountType, input.category)) {
        throw appError("BAD_REQUEST", "CATEGORY_NOT_ALLOWED");
      }
      await ctx.db.transaction.update({
        where: { id: input.id },
        data: { category: input.category, categoryConfidence: null },
      });
      return { id: input.id };
    }),
});

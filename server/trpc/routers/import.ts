import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getBankCsvConfig } from "@server/lib/csv/banks";
import { parseBankStatement } from "@server/lib/csv/parse-bank-statement";
import { createTRPCRouter, publicProcedure } from "@server/trpc/init";

/** Le CSV voyage en texte dans le JSON : un relevé fait quelques centaines de lignes, loin de la
 * limite Vercel (4,5 Mo). */
const createImportInputSchema = z.object({
  bankAccountId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  csvText: z.string().min(1).max(2_000_000),
});

export const importRouter = createTRPCRouter({
  /**
   * Parse un relevé CSV et l'enregistre : un `ImportBatch` (PENDING_REVIEW) + ses `Transaction`
   * sans catégorie. La catégorisation IA et la relecture viennent ensuite ; les dashboards ne
   * compteront que les imports VALIDATED.
   */
  create: publicProcedure.input(createImportInputSchema).mutation(async ({ ctx, input }) => {
    const bankAccount = await ctx.db.bankAccount.findUnique({
      where: { id: input.bankAccountId },
    });
    if (!bankAccount) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Compte bancaire introuvable." });
    }

    const config = bankAccount.bank ? getBankCsvConfig(bankAccount.bank) : undefined;
    if (!config) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Aucun format CSV connu pour la banque « ${bankAccount.bank ?? "non renseignée"} ».`,
      });
    }

    const { transactions, errors } = parseBankStatement(input.csvText, config);
    if (transactions.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Aucune transaction lisible dans ce fichier : format de banque incorrect ?",
      });
    }

    // Une seule transaction SQL : un import est écrit en entier ou pas du tout.
    const batch = await ctx.db.importBatch.create({
      data: {
        bankAccountId: bankAccount.id,
        fileName: input.fileName,
        transactions: {
          createMany: {
            data: transactions.map((transaction) => ({
              ...transaction,
              bankAccountId: bankAccount.id,
            })),
          },
        },
      },
      select: { id: true },
    });

    // Les lignes illisibles ne bloquent pas l'import : on les renvoie pour que l'UI les signale.
    return { batchId: batch.id, importedCount: transactions.length, errors };
  }),
});

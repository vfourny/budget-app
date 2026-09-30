import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { NEEDS_REVIEW_WHERE, needsReview } from "@server/lib/categorize/needs-review";
import { AccountType } from "@server/generated/prisma/enums";
import { getBankCsvConfig } from "@server/lib/csv/banks";
import { parseBankStatement } from "@server/lib/csv/parse-bank-statement";
import { createTRPCRouter, publicProcedure } from "@server/trpc/init";

/** Le CSV voyage en texte dans le JSON : un relevé fait quelques centaines de lignes, loin de la
 * limite Vercel (4,5 Mo). */
const createImportInputSchema = z.object({
  accountType: z.enum(AccountType),
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
    const config = getBankCsvConfig(input.accountType);

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
        accountType: input.accountType,
        fileName: input.fileName,
        transactions: {
          createMany: {
            data: transactions.map((transaction) => ({
              ...transaction,
              accountType: input.accountType,
            })),
          },
        },
      },
      select: { id: true },
    });

    // Les lignes illisibles ne bloquent pas l'import : on les renvoie pour que l'UI les signale.
    return { batchId: batch.id, importedCount: transactions.length, errors };
  }),

  /** Historique : un import par ligne, le plus récent d'abord. */
  list: publicProcedure.query(async ({ ctx }) => {
    const batches = await ctx.db.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        status: true,
        createdAt: true,
        accountType: true,
        _count: {
          select: { transactions: true },
        },
      },
    });
    const toReview = await ctx.db.transaction.groupBy({
      by: ["importBatchId"],
      where: { importBatchId: { in: batches.map((batch) => batch.id) }, ...NEEDS_REVIEW_WHERE },
      _count: { _all: true },
    });
    const toReviewById = new Map(toReview.map((row) => [row.importBatchId, row._count._all]));

    return batches.map((batch) => ({
      id: batch.id,
      fileName: batch.fileName,
      status: batch.status,
      createdAt: batch.createdAt,
      accountType: batch.accountType,
      lineCount: batch._count.transactions,
      toReviewCount: batch.status === "VALIDATED" ? 0 : (toReviewById.get(batch.id) ?? 0),
    }));
  }),

  /** Un import et ses lignes (ordre du relevé), pour l'écran de relecture. */
  get: publicProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const batch = await ctx.db.importBatch.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        fileName: true,
        status: true,
        createdAt: true,
        accountType: true,
        transactions: {
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            date: true,
            label: true,
            amountCents: true,
            category: true,
            categoryConfidence: true,
          },
        },
      },
    });
    if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import introuvable." });

    return {
      id: batch.id,
      fileName: batch.fileName,
      status: batch.status,
      createdAt: batch.createdAt,
      accountType: batch.accountType,
      transactions: batch.transactions.map((transaction) => ({
        ...transaction,
        needsReview: needsReview(transaction),
      })),
    };
  }),

  /**
   * Valide un import : il compte désormais dans les dashboards et ses lignes servent d'exemples
   * à la catégorisation. Refusé tant qu'une ligne est sans catégorie ou à faible confiance.
   */
  validate: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const batch = await ctx.db.importBatch.findUnique({
        where: { id: input.id },
        select: { status: true },
      });
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import introuvable." });
      if (batch.status === "VALIDATED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cet import est déjà validé." });
      }

      const remaining = await ctx.db.transaction.count({
        where: { importBatchId: input.id, ...NEEDS_REVIEW_WHERE },
      });
      if (remaining > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Encore ${remaining} transaction(s) à catégoriser avant de valider.`,
        });
      }

      await ctx.db.importBatch.update({
        where: { id: input.id },
        data: { status: "VALIDATED", validatedAt: new Date() },
      });
      return { id: input.id };
    }),

  /** Supprime un import et, en cascade, toutes ses transactions (validé ou non). */
  delete: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.importBatch.deleteMany({ where: { id: input.id } });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Import introuvable." });
      return { id: input.id };
    }),
});

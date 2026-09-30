import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { TransactionCategory } from "@server/generated/prisma/enums";
import { getAnthropicClient } from "@server/lib/anthropic";
import {
  LOW_CONFIDENCE_THRESHOLD,
  categorizeTransactions,
} from "@server/lib/categorize/categorize-transactions";
import { createTRPCRouter, publicProcedure } from "@server/trpc/init";

/** Nombre maximum d'exemples validés montrés à l'IA (un par libellé distinct, les plus récents). */
const MAX_EXAMPLES = 60;

export const categorizeRouter = createTRPCRouter({
  /**
   * Propose une catégorie (+ confiance) pour les transactions sans catégorie d'un import en
   * attente de relecture. Relançable : seules les lignes encore sans catégorie sont traitées, et
   * rien n'est écrit si l'appel à l'IA échoue.
   */
  run: publicProcedure
    .input(z.object({ batchId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const client = getAnthropicClient();
      if (!client) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "ANTHROPIC_API_KEY n'est pas configurée sur le serveur.",
        });
      }

      const batch = await ctx.db.importBatch.findUnique({ where: { id: input.batchId } });
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import introuvable." });
      if (batch.status !== "PENDING_REVIEW") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cet import est déjà validé." });
      }

      const transactions = await ctx.db.transaction.findMany({
        where: { importBatchId: batch.id, category: null },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        select: { id: true, label: true, amountCents: true },
      });
      if (transactions.length === 0) {
        return { categorizedCount: 0, uncategorizedCount: 0, lowConfidenceCount: 0 };
      }

      // Exemples few-shot : transactions déjà validées du même compte (vide au tout premier import).
      const validated = await ctx.db.transaction.findMany({
        where: {
          bankAccountId: batch.bankAccountId,
          category: { not: null },
          importBatch: { status: "VALIDATED" },
        },
        distinct: ["label"],
        orderBy: { date: "desc" },
        take: MAX_EXAMPLES,
        select: { label: true, amountCents: true, category: true },
      });
      const examples = validated.flatMap((example) =>
        example.category ? [{ ...example, category: example.category }] : [],
      );

      let results;
      try {
        results = await categorizeTransactions(client, transactions, examples);
      } catch (error) {
        console.error("Catégorisation : échec de l'appel à l'IA", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "La catégorisation par l'IA a échoué, réessaie dans un instant.",
        });
      }

      // On regroupe les lignes qui reçoivent la même (catégorie, confiance arrondie à 0,01) pour
      // écrire avec quelques `updateMany` plutôt qu'un `update` par ligne.
      const groups = new Map<
        string,
        { category: TransactionCategory; confidence: number; ids: string[] }
      >();
      let lowConfidenceCount = 0;
      results.forEach((result, index) => {
        if (!result) return;
        const confidence = Math.round(result.confidence * 100) / 100;
        if (confidence < LOW_CONFIDENCE_THRESHOLD) lowConfidenceCount++;
        const key = `${result.category}:${confidence}`;
        const group = groups.get(key) ?? { category: result.category, confidence, ids: [] };
        group.ids.push(transactions[index].id);
        groups.set(key, group);
      });

      await ctx.db.$transaction(
        [...groups.values()].map((group) =>
          ctx.db.transaction.updateMany({
            where: { id: { in: group.ids } },
            data: { category: group.category, categoryConfidence: group.confidence },
          }),
        ),
      );

      const categorizedCount = results.filter((result) => result !== null).length;
      return {
        categorizedCount,
        uncategorizedCount: transactions.length - categorizedCount,
        lowConfidenceCount,
      };
    }),
});

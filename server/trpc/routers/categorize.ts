import { z } from "zod";

import type { TransactionCategory } from "@server/generated/prisma/enums";
import { appError } from "@server/lib/app-error";
import {
  LOW_CONFIDENCE_THRESHOLD,
  categorizeTransactions,
  type CategorizeExample,
} from "@server/lib/categorize/categorize-transactions";
import { labelKey, normalizeLabel } from "@server/lib/categorize/normalize-label";
import { gemini } from "@server/lib/gemini";
import { geminiTRPCError } from "@server/lib/gemini-errors";
import { createTRPCRouter, protectedProcedure } from "@server/trpc/init";

/**
 * Nombre maximum d'exemples validés montrés à l'IA : un par libellé distinct (hors date et n° de
 * carte), les plus récents d'abord. ~20 tokens par exemple, soit ~6 000 tokens au plafond.
 */
const MAX_EXAMPLES = 300;

export const categorizeRouter = createTRPCRouter({
  /**
   * Propose une catégorie (+ confiance) pour les transactions sans catégorie d'un import en
   * attente de relecture. Relançable : seules les lignes encore sans catégorie sont traitées, et
   * rien n'est écrit si l'appel à l'IA échoue.
   */
  run: protectedProcedure
    .input(z.object({ batchId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const batch = await ctx.db.importBatch.findFirst({ where: { id: input.batchId, userId } });
      if (!batch) throw appError("NOT_FOUND", "IMPORT_NOT_FOUND");
      if (batch.status !== "PENDING_REVIEW") {
        throw appError("BAD_REQUEST", "IMPORT_ALREADY_VALIDATED");
      }

      const transactions = await ctx.db.transaction.findMany({
        where: { importBatchId: batch.id, category: null },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        select: { id: true, label: true, amountCents: true },
      });
      if (transactions.length === 0) {
        return { categorizedCount: 0, uncategorizedCount: 0, lowConfidenceCount: 0 };
      }

      // Exemples few-shot : transactions déjà validées du même type de compte (vide au tout premier
      // import). `distinct` SQL sur le libellé brut limite déjà les lignes lues ; le dédoublonnage
      // sur le libellé normalisé (sans date ni n° de carte) se fait ensuite, en gardant les plus récents.
      const validated = await ctx.db.transaction.findMany({
        where: {
          userId,
          accountType: batch.accountType,
          category: { not: null },
          importBatch: { status: "VALIDATED" },
        },
        distinct: ["label"],
        orderBy: { date: "desc" },
        select: { label: true, amountCents: true, category: true },
      });
      const seen = new Set<string>();
      const examples: CategorizeExample[] = [];
      for (const example of validated) {
        if (!example.category) continue;
        const key = labelKey(example.label);
        if (seen.has(key)) continue;
        seen.add(key);
        examples.push({
          label: normalizeLabel(example.label),
          amountCents: example.amountCents,
          category: example.category,
        });
        if (examples.length === MAX_EXAMPLES) break;
      }

      let results;
      try {
        results = await categorizeTransactions(gemini, batch.accountType, transactions, examples);
      } catch (error) {
        console.error("Catégorisation : échec de l'appel à l'IA", error);
        throw geminiTRPCError(error, "CATEGORIZATION_FAILED");
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

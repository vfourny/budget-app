import { ApiError } from "@google/genai";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { TransactionCategory } from "@server/generated/prisma/enums";
import {
  LOW_CONFIDENCE_THRESHOLD,
  categorizeTransactions,
  type CategorizeExample,
} from "@server/lib/categorize/categorize-transactions";
import { labelKey, normalizeLabel } from "@server/lib/categorize/normalize-label";
import { gemini } from "@server/lib/gemini";
import { createTRPCRouter, publicProcedure } from "@server/trpc/init";

/**
 * Nombre maximum d'exemples validés montrés à l'IA : un par libellé distinct (hors date et n° de
 * carte), les plus récents d'abord. ~20 tokens par exemple, soit ~6 000 tokens au plafond.
 */
const MAX_EXAMPLES = 300;

/** Message précis selon l'erreur Gemini : inutile de « réessayer » une clé refusée. */
function toTRPCError(error: unknown): TRPCError {
  const status = error instanceof ApiError ? error.status : undefined;
  if (status === 429) {
    return new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        "Quota Gemini atteint : réessaie dans une minute (ou demain si le quota du jour est épuisé).",
    });
  }
  if (status === 400 || status === 401 || status === 403) {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Gemini a refusé la requête : clé API invalide ou modèle indisponible pour ce compte.",
    });
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "La catégorisation par l'IA a échoué, réessaie dans un instant.",
  });
}

export const categorizeRouter = createTRPCRouter({
  /**
   * Propose une catégorie (+ confiance) pour les transactions sans catégorie d'un import en
   * attente de relecture. Relançable : seules les lignes encore sans catégorie sont traitées, et
   * rien n'est écrit si l'appel à l'IA échoue.
   */
  run: publicProcedure
    .input(z.object({ batchId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
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

      // Exemples few-shot : transactions déjà validées du même type de compte (vide au tout premier
      // import). `distinct` SQL sur le libellé brut limite déjà les lignes lues ; le dédoublonnage
      // sur le libellé normalisé (sans date ni n° de carte) se fait ensuite, en gardant les plus récents.
      const validated = await ctx.db.transaction.findMany({
        where: {
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
        results = await categorizeTransactions(gemini, transactions, examples);
      } catch (error) {
        console.error("Catégorisation : échec de l'appel à l'IA", error);
        throw toTRPCError(error);
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

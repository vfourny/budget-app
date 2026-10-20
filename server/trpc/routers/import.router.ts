import { NEEDS_REVIEW_WHERE } from '@server/services/categorize/needs-review.service'
import { detectCsvFormat } from '@server/services/csv/detect-format.service'
import { loadImportReview } from '@server/services/imports/import-review.service'
import {
  createImportInputSchema,
  importStatement,
} from '@server/services/imports/import-statement.service'
import { importCategorizeRouter } from '@server/trpc/routers/import-categorize.router'
import { createTRPCRouter, protectedProcedure } from '@server/trpc/trpc.config'
import { appError } from '@server/utils/app-error.util'
import { geminiTRPCError } from '@server/utils/gemini-error.util'
import { gemini } from '@server/utils/gemini.client'
import { findPendingImport } from '@server/utils/ownership.service'
import { parseBankStatement } from '@shared/transactions/parse-bank-statement.util'
import { checkParsedStatement } from '@shared/transactions/statement-checks.util'
import { z } from 'zod'

/** Nombre de lignes montrées dans l'aperçu du format détecté. */
const PREVIEW_LINES = 5

export const importRouter = createTRPCRouter({
  /** Catégorisation IA des lignes d'un import en relecture. */
  categorize: importCategorizeRouter,

  /**
   * Format d'un CSV inconnu : l'IA désigne les colonnes (date, libellé, montant) à partir de
   * l'en-tête et de quelques lignes, puis le fichier est parsé avec ce mapping pour fournir un
   * aperçu et des contrôles de cohérence. Rien n'est écrit : le format n'est enregistré qu'à la
   * confirmation, avec `create`.
   */
  detectFormat: protectedProcedure
    .input(z.object({ csvText: createImportInputSchema.shape.csvText }))
    .mutation(async ({ input }) => {
      let detected
      try {
        detected = await detectCsvFormat(gemini, input.csvText)
      } catch (error) {
        console.error('Détection du format CSV : échec', error)
        throw geminiTRPCError(error, 'CSV_FORMAT_DETECTION_FAILED')
      }

      const parsed = parseBankStatement(input.csvText, detected.config)
      return {
        bankName: detected.bankName,
        config: detected.config,
        columns: detected.columns,
        transactionCount: parsed.transactions.length,
        preview: parsed.transactions.slice(0, PREVIEW_LINES),
        errors: parsed.errors.slice(0, PREVIEW_LINES),
        checks: checkParsedStatement(parsed),
      }
    }),

  /**
   * Parse un relevé CSV et l'enregistre : un `ImportBatch` (PENDING_REVIEW) + ses `Transaction`
   * sans catégorie. La catégorisation IA et la relecture viennent ensuite ; les dashboards ne
   * compteront que les imports VALIDATED.
   */
  create: protectedProcedure
    .input(createImportInputSchema)
    .mutation(({ ctx, input }) =>
      importStatement(ctx.db, ctx.session.user.id, input),
    ),

  /** Historique : un import par ligne, le plus récent d'abord. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const batches = await ctx.db.importBatch.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: 'desc' },
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
    })
    const toReview = await ctx.db.transaction.groupBy({
      by: ['importBatchId'],
      where: {
        importBatchId: { in: batches.map((batch) => batch.id) },
        ...NEEDS_REVIEW_WHERE,
      },
      _count: { _all: true },
    })
    const toReviewById = new Map(
      toReview.map((row) => [row.importBatchId, row._count._all]),
    )

    return batches.map((batch) => ({
      id: batch.id,
      fileName: batch.fileName,
      status: batch.status,
      createdAt: batch.createdAt,
      accountType: batch.accountType,
      lineCount: batch._count.transactions,
      toReviewCount:
        batch.status === 'VALIDATED' ? 0 : (toReviewById.get(batch.id) ?? 0),
    }))
  }),

  /** Un import et ses lignes (ordre du relevé), pour l'écran de relecture. */
  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(({ ctx, input }) =>
      loadImportReview(ctx.db, ctx.session.user.id, input.id),
    ),

  /**
   * Valide un import : il compte désormais dans les dashboards et ses lignes servent d'exemples
   * à la catégorisation. Refusé tant qu'une ligne est sans catégorie ou à faible confiance.
   */
  validate: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await findPendingImport(ctx.db, ctx.session.user.id, input.id)

      const remaining = await ctx.db.transaction.count({
        where: { importBatchId: input.id, ...NEEDS_REVIEW_WHERE },
      })
      if (remaining > 0) {
        throw appError('BAD_REQUEST', 'REMAINING_TO_REVIEW', { remaining })
      }

      await ctx.db.importBatch.update({
        where: { id: input.id },
        data: { status: 'VALIDATED', validatedAt: new Date() },
      })
      return { id: input.id }
    }),

  /** Supprime un import et, en cascade, toutes ses transactions (validé ou non). */
  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.importBatch.deleteMany({
        where: { id: input.id, userId: ctx.session.user.id },
      })
      if (count === 0) throw appError('NOT_FOUND', 'IMPORT_NOT_FOUND')
      return { id: input.id }
    }),
})

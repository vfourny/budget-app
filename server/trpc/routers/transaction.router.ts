import { TransactionCategory } from '@server/generated/prisma/enums'
import { appError } from '@server/lib/app-error.util'
import {
  findEditableTransaction,
  findOwnedApartment,
} from '@server/lib/ownership.service'
import { createTRPCRouter, protectedProcedure } from '@server/trpc/trpc.config'
import { isCategoryOf } from '@shared/transactions/categories.rules'
import { z } from 'zod'

export const transactionRouter = createTRPCRouter({
  /**
   * Correction manuelle d'une catégorie à la relecture. `categoryConfidence` repasse à `null` :
   * catégorie choisie par l'utilisateur = « Confirmée » (plus « à vérifier »). Refusé une fois
   * l'import validé.
   */
  setCategory: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        category: z.enum(TransactionCategory),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await findEditableTransaction(
        ctx.db,
        ctx.session.user.id,
        input.id,
      )
      // Une catégorie pro sur une ligne perso (ou l'inverse) fausserait les deux dashboards.
      if (!isCategoryOf(transaction.accountType, input.category)) {
        throw appError('BAD_REQUEST', 'CATEGORY_NOT_ALLOWED')
      }
      await ctx.db.transaction.update({
        where: { id: input.id },
        data: { category: input.category, categoryConfidence: null },
      })
      return { id: input.id }
    }),

  /**
   * Rattache une ligne d'un relevé appartement à un autre appartement (un compte peut porter
   * plusieurs biens, R11). Refusé une fois l'import validé ou pour un compte non appartement.
   */
  setApartment: protectedProcedure
    .input(z.object({ id: z.string().min(1), apartmentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const transaction = await findEditableTransaction(
        ctx.db,
        userId,
        input.id,
      )
      if (transaction.accountType !== 'APARTMENT') {
        throw appError('BAD_REQUEST', 'APARTMENT_NOT_ALLOWED')
      }
      const apartment = await findOwnedApartment(
        ctx.db,
        userId,
        input.apartmentId,
      )
      await ctx.db.transaction.update({
        where: { id: input.id },
        data: { apartmentId: apartment.id },
      })
      return { id: input.id }
    }),
})

import { z } from "zod";

import { Prisma } from "@server/generated/prisma/client";
import { appError } from "@server/lib/app-error";
import { createTRPCRouter, protectedProcedure } from "@server/trpc/init";

const clientSchema = z.object({
  name: z.string().trim().min(1).max(80),
  /** Mot du libellé bancaire de ses virements (vide = le nom sert de mot-clé). */
  bankLabelKeyword: z.string().trim().max(80).nullable(),
  defaultDailyRateCents: z.number().int().min(0).max(10_000_00).nullable(),
});

/** Nom déjà pris (contrainte unique `userId` + `name`) → code métier plutôt qu'une erreur Prisma. */
function rethrowDuplicate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw appError("CONFLICT", "CLIENT_NAME_TAKEN");
  }
  throw error;
}

export const clientRouter = createTRPCRouter({
  /** Clients de Stygma, par nom. */
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.client.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, bankLabelKeyword: true, defaultDailyRateCents: true },
    }),
  ),

  create: protectedProcedure.input(clientSchema).mutation(({ ctx, input }) =>
    ctx.db.client
      .create({
        data: {
          ...input,
          bankLabelKeyword: input.bankLabelKeyword || null,
          userId: ctx.session.user.id,
        },
        select: { id: true, name: true },
      })
      .catch(rethrowDuplicate),
  ),

  update: protectedProcedure
    .input(clientSchema.extend({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const client = await ctx.db.client.findFirst({ where: { id, userId: ctx.session.user.id } });
      if (!client) throw appError("NOT_FOUND", "CLIENT_NOT_FOUND");
      await ctx.db.client
        .update({
          where: { id },
          data: { ...data, bankLabelKeyword: data.bankLabelKeyword || null },
        })
        .catch(rethrowDuplicate);
      return { id };
    }),
});

import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError, z } from "zod";

import { AppErrorCause, appError } from "@server/lib/app-error";
import { auth } from "@server/lib/auth";
import { db } from "@server/lib/db";

/** Contexte disponible dans toutes les procédures (`ctx`), recréé à chaque requête. */
export async function createTRPCContext(opts: { headers: Headers }) {
  // Session lue dans le cookie de la requête (`null` si absente ou expirée).
  const session = await auth.api.getSession({ headers: opts.headers });
  return { db, headers: opts.headers, session };
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  // superjson : Date, Map, BigInt… survivent au passage serveur → navigateur.
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Erreurs de validation Zod exposées champ par champ (pour les formulaires).
        zodError: error.cause instanceof ZodError ? z.flattenError(error.cause) : null,
        // Erreur métier : code + paramètres, traduits côté front (voir `server/lib/app-error.ts`).
        appError:
          error.cause instanceof AppErrorCause
            ? { code: error.cause.code, params: error.cause.params }
            : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;

/** Procédure sans auth : réservée à ce qui doit rester public (aucune pour l'instant). */
export const publicProcedure = t.procedure;

/**
 * Procédure réservée à l'utilisateur connecté : sans session valide, `UNAUTHORIZED`. Toutes les
 * routes de données l'utilisent (≈ un middleware d'auth Nuxt / un guard). `ctx.session` y est
 * garanti non nul.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw appError("UNAUTHORIZED", "NOT_AUTHENTICATED");
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

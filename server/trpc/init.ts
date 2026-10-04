import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError, z } from "zod";

import { AppErrorCause } from "@server/lib/app-error";
import { db } from "@server/lib/db";

/** Contexte disponible dans toutes les procédures (`ctx`), recréé à chaque requête. */
export function createTRPCContext(opts: { headers: Headers }) {
  return { db, headers: opts.headers };
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

/** Procédure sans auth. Une `protectedProcedure` arrivera avec Better Auth. */
export const publicProcedure = t.procedure;

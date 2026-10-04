import { TRPCError } from "@trpc/server";

/**
 * Erreurs « métier » renvoyées au front sous forme de **code**, jamais de texte : le serveur ne
 * connaît pas la langue de l'UI. Le front traduit chaque code dans `src/lib/i18n/fr/errors.ts`
 * (dictionnaire exhaustif : un code ajouté ici sans traduction casse `tsc`).
 */
export type AppErrorCode =
  | "IMPORT_NOT_FOUND"
  | "IMPORT_ALREADY_VALIDATED"
  | "TRANSACTION_NOT_FOUND"
  | "NO_READABLE_TRANSACTIONS"
  | "ALL_ROWS_ALREADY_IMPORTED"
  | "REMAINING_TO_REVIEW"
  | "GEMINI_QUOTA_EXCEEDED"
  | "GEMINI_REFUSED"
  | "CATEGORIZATION_FAILED";

/** Paramètres d'interpolation des codes qui en ont besoin (les autres n'en prennent pas). */
export interface AppErrorParams {
  REMAINING_TO_REVIEW: { remaining: number };
}

/** Portée par `TRPCError.cause` ; l'`errorFormatter` (init.ts) l'expose au client. */
export class AppErrorCause extends Error {
  constructor(
    readonly code: AppErrorCode,
    readonly params?: unknown,
  ) {
    super(code);
    this.name = "AppErrorCause";
  }
}

/**
 * `throw appError("NOT_FOUND", "IMPORT_NOT_FOUND")`. Le `message` du TRPCError est le code (lisible
 * dans les logs) ; le paramètre n'est demandé que pour les codes de `AppErrorParams`.
 */
export function appError<Code extends AppErrorCode>(
  trpcCode: TRPCError["code"],
  code: Code,
  ...params: Code extends keyof AppErrorParams ? [params: AppErrorParams[Code]] : []
): TRPCError {
  return new TRPCError({
    code: trpcCode,
    message: code,
    cause: new AppErrorCause(code, params[0]),
  });
}

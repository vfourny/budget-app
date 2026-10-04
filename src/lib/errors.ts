import { TRPCClientError } from "@trpc/client";

import { fr } from "@/lib/i18n/fr";
import type { CsvParseError } from "@server/lib/csv/types";
import type { AppRouter } from "@server/trpc/root";

/**
 * Message à afficher pour une erreur d'appel tRPC : le serveur renvoie un **code** (`appError` dans
 * `error.data`, voir `server/lib/app-error.ts`), traduit ici via `fr.errors`. Validation Zod ou
 * erreur réseau : message générique.
 */
export function errorMessage(error: unknown): string {
  if (!(error instanceof TRPCClientError)) return fr.errors.UNKNOWN;

  const data = (error as TRPCClientError<AppRouter>).data;
  if (data?.appError) {
    const message = fr.errors[data.appError.code] as string | ((params: unknown) => string);
    return typeof message === "function" ? message(data.appError.params) : message;
  }
  return data?.zodError ? fr.errors.INVALID_INPUT : fr.errors.UNKNOWN;
}

/** Raison affichée pour une ligne de relevé écartée (le serveur n'envoie qu'un code + la valeur). */
export function csvErrorMessage(error: Pick<CsvParseError, "code" | "value">): string {
  return fr.csvErrors[error.code](error.value);
}

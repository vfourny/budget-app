import { ApiError } from "@google/genai";

import { appError } from "@server/lib/app-error";

/** Code précis selon l'erreur Gemini : inutile de « réessayer » une clé refusée. `fallback` est le
 * code de l'opération qui a échoué (catégorisation, détection de format…) pour les autres erreurs. */
export function geminiTRPCError(
  error: unknown,
  fallback: "CATEGORIZATION_FAILED" | "CSV_FORMAT_DETECTION_FAILED",
) {
  const status = error instanceof ApiError ? error.status : undefined;
  if (status === 429) return appError("TOO_MANY_REQUESTS", "GEMINI_QUOTA_EXCEEDED");
  if (status === 400 || status === 401 || status === 403) {
    return appError("PRECONDITION_FAILED", "GEMINI_REFUSED");
  }
  return appError("INTERNAL_SERVER_ERROR", fallback);
}

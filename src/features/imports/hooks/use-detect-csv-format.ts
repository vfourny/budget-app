import { useMutation } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc";

/**
 * Demande à l'IA de détecter les colonnes d'un CSV au format inconnu. C'est une mutation (et non une
 * query) : l'appel coûte un appel Gemini et ne doit partir que sur action explicite (≈ un
 * `$fetch` déclenché à la main dans un composable Vue, pas un `useFetch` automatique).
 */
export function useDetectCsvFormat() {
  return useMutation(trpc.import.detectFormat.mutationOptions());
}

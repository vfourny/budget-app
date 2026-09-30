import { useMutation } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc";

/**
 * Envoie un relevé CSV au serveur. Pas d'invalidation de cache pour l'instant : aucune requête
 * n'affiche encore les imports (l'écran « Imports » arrivera avec la relecture et ajoutera
 * `queryClient.invalidateQueries(trpc.import.list.queryFilter())` dans `onSuccess`).
 */
export function useImportStatement() {
  return useMutation(trpc.import.create.mutationOptions());
}

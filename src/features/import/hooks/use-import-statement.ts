import { useMutation } from "@tanstack/react-query";

import { queryClient, trpc, trpcClient } from "@/lib/trpc";

/**
 * Importe un relevé CSV puis lance aussitôt la catégorisation IA (≈ un `async function` qui
 * enchaîne deux appels, dans un composable Vue). Si seule la catégorisation échoue, l'import
 * existe quand même : on renvoie `categorizationError` et la relecture montrera les lignes
 * « à catégoriser ».
 */
export function useImportStatement() {
  return useMutation({
    mutationFn: async (input: { bankAccountId: string; fileName: string; csvText: string }) => {
      const created = await trpcClient.import.create.mutate(input);

      let categorizationError: string | null = null;
      try {
        await trpcClient.categorize.run.mutate({ batchId: created.batchId });
      } catch (error) {
        categorizationError = error instanceof Error ? error.message : "Catégorisation échouée.";
      }
      return { ...created, categorizationError };
    },
    onSuccess: () => queryClient.invalidateQueries(trpc.import.list.queryFilter()),
  });
}

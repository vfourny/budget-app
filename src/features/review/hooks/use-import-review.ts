import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient, trpc } from "@/lib/trpc";

export function useImportReview(importId: string) {
  return useQuery(trpc.import.get.queryOptions({ id: importId }));
}

/** Corrige la catégorie d'une ligne puis rafraîchit la relecture et l'historique (compteurs). */
export function useSetCategory(importId: string) {
  return useMutation({
    ...trpc.transaction.setCategory.mutationOptions(),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries(trpc.import.get.queryFilter({ id: importId })),
        queryClient.invalidateQueries(trpc.import.list.queryFilter()),
      ]),
  });
}

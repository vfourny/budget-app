import { useMutation } from "@tanstack/react-query";

import { queryClient, trpc } from "@/lib/trpc";

/** Supprime un import (et ses lignes) puis rafraîchit l'historique. */
export function useDeleteImport() {
  return useMutation({
    ...trpc.import.delete.mutationOptions(),
    onSuccess: async (_data, variables) => {
      queryClient.removeQueries(trpc.import.get.queryFilter({ id: variables.id }));
      await queryClient.invalidateQueries(trpc.import.list.queryFilter());
    },
  });
}

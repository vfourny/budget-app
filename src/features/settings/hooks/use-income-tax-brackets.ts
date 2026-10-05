import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient, trpc } from "@/lib/trpc";

/** Barème de l'IR d'une année (tableau vide = non renseigné). */
export function useIncomeTaxBrackets(year: number) {
  return useQuery(trpc.settings.incomeTaxBrackets.queryOptions({ year }));
}

export function useSetIncomeTaxBrackets() {
  return useMutation({
    ...trpc.settings.setIncomeTaxBrackets.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries(trpc.settings.incomeTaxBrackets.queryFilter()),
  });
}

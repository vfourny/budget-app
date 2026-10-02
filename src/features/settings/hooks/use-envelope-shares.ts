import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient, trpc } from "@/lib/trpc";

/** Part du revenu recommandée par enveloppe (en %). */
export function useEnvelopeShares() {
  return useQuery(trpc.settings.envelopeShares.queryOptions());
}

export function useSetEnvelopeShares() {
  return useMutation({
    ...trpc.settings.setEnvelopeShares.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries(trpc.settings.envelopeShares.queryFilter()),
  });
}

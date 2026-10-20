import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient, trpc } from '@/lib/trpc'

/** Part du revenu recommandée par enveloppe (en %). */
export function useEnvelopeShares() {
  return useQuery(trpc.personal.envelopeShares.queryOptions())
}

export function useSetEnvelopeShares() {
  return useMutation({
    ...trpc.personal.setEnvelopeShares.mutationOptions(),
    onSuccess: () =>
      queryClient.invalidateQueries(trpc.personal.envelopeShares.queryFilter()),
  })
}

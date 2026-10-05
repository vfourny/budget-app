import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient, trpc } from "@/lib/trpc";

/** Clients de Stygma (facturation, rapprochement des encaissements). */
export function useClients() {
  return useQuery(trpc.client.list.queryOptions());
}

/** Toute modification de client change aussi le dashboard Pro (noms, rapprochement). */
const invalidate = () =>
  Promise.all([
    queryClient.invalidateQueries(trpc.client.list.queryFilter()),
    queryClient.invalidateQueries(trpc.professional.pathFilter()),
  ]);

export function useCreateClient() {
  return useMutation({ ...trpc.client.create.mutationOptions(), onSuccess: invalidate });
}

export function useUpdateClient() {
  return useMutation({ ...trpc.client.update.mutationOptions(), onSuccess: invalidate });
}

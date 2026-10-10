import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient, trpc } from "@/lib/trpc";

/** Appartements de l'utilisateur, avec le solde de début d'année de `year`. */
export function useApartments(year: number) {
  return useQuery(trpc.apartment.list.queryOptions({ year }));
}

/** Crée ou met à jour un appartement (et son solde de début d'année). */
export function useSaveApartment() {
  return useMutation({
    ...trpc.apartment.save.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries(trpc.apartment.list.queryFilter()),
  });
}

export function useDeleteApartment() {
  return useMutation({
    ...trpc.apartment.delete.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries(trpc.apartment.list.queryFilter()),
  });
}

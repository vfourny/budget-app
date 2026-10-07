import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc";

/** Id et nom des appartements, pour les sélecteurs (import, relecture). */
export function useApartmentOptions() {
  return useQuery(trpc.apartment.options.queryOptions());
}

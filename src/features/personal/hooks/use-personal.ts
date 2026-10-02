import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc";

/** Mois ayant des données validées (plus récent d'abord). */
export function usePeriods() {
  return useQuery(trpc.personal.periods.queryOptions());
}

/** Totaux d'un mois, ou de l'année entière si `month` est absent. */
export function useOverview(year: number, month?: number) {
  return useQuery(trpc.personal.overview.queryOptions({ year, month }));
}

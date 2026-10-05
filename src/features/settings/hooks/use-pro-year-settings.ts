import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient, trpc } from "@/lib/trpc";

/** Règles pro applicables à une année (+ origine : année elle-même, reprise ou défaut). */
export function useProYearSettings(year: number) {
  return useQuery(trpc.settings.proYear.queryOptions({ year }));
}

/** Années ayant des règles pro enregistrées. */
export function useProYearsConfigured() {
  return useQuery(trpc.settings.proYearsConfigured.queryOptions());
}

/** Enregistre les règles d'une année ; les années suivantes non configurées en héritent. */
export function useSetProYearSettings() {
  return useMutation({
    ...trpc.settings.setProYear.mutationOptions(),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries(trpc.settings.proYear.queryFilter()),
        queryClient.invalidateQueries(trpc.settings.proYearsConfigured.queryFilter()),
      ]),
  });
}

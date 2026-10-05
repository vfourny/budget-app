import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient, trpc } from "@/lib/trpc";

/** Règles pro applicables à une année (+ origine : année elle-même, reprise ou défaut). */
export function useProfessionalYearSettings(year: number) {
  return useQuery(trpc.settings.professionalYear.queryOptions({ year }));
}

/** Années ayant des règles pro enregistrées. */
export function useProfessionalYearsConfigured() {
  return useQuery(trpc.settings.professionalYearsConfigured.queryOptions());
}

/** Enregistre les règles d'une année ; les années suivantes non configurées en héritent. */
export function useSetProfessionalYearSettings() {
  return useMutation({
    ...trpc.settings.setProfessionalYear.mutationOptions(),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries(trpc.settings.professionalYear.queryFilter()),
        queryClient.invalidateQueries(trpc.settings.professionalYearsConfigured.queryFilter()),
      ]),
  });
}

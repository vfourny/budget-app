import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient, trpc } from '@/lib/trpc'

/** Règles pro applicables à une année (+ origine : année elle-même, reprise ou défaut). */
export function useProfessionalYearSettings(year: number) {
  return useQuery(trpc.professional.settings.year.queryOptions({ year }))
}

/** Années ayant des règles pro enregistrées. */
export function useProfessionalYearsConfigured() {
  return useQuery(trpc.professional.settings.configuredYears.queryOptions())
}

/** Enregistre les règles d'une année ; les années suivantes non configurées en héritent. */
export function useSetProfessionalYearSettings() {
  return useMutation({
    ...trpc.professional.settings.setYear.mutationOptions(),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries(
          trpc.professional.settings.year.queryFilter(),
        ),
        queryClient.invalidateQueries(
          trpc.professional.settings.configuredYears.queryFilter(),
        ),
      ]),
  })
}

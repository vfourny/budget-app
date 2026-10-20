import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient, trpc } from '@/lib/trpc'

/** Mois clos proposés par le sélecteur (du plus récent au plus ancien). */
export function useApartmentPeriods() {
  return useQuery(trpc.apartment.dashboard.periods.queryOptions())
}

/** Un mois : colonnes de chaque appartement actif, KPI et transactions rattachées. `apartmentId` = pastille. */
export function useApartmentsMonth(
  year: number,
  month: number,
  apartmentId: string | null,
) {
  return useQuery(
    trpc.apartment.dashboard.month.queryOptions({ year, month, apartmentId }),
  )
}

/** Une année : colonnes sur les mois clos, rendements et seuils LMNP. */
export function useApartmentsYear(year: number, apartmentId: string | null) {
  return useQuery(
    trpc.apartment.dashboard.year.queryOptions({ year, apartmentId }),
  )
}

/** Prévisionnel d'un appartement pour un mois : lignes (saisie et valeur par défaut) et gérance. */
export function useApartmentForecastInputs(
  apartmentId: string,
  year: number,
  month: number,
) {
  return useQuery(
    trpc.apartment.forecast.inputs.queryOptions({ apartmentId, year, month }),
  )
}

/**
 * Enregistre les saisies d'un mois (et la gérance d'un bien géré) ; le prévu change le dashboard et
 * les mois suivants (loyer reporté, taux de gérance).
 */
export function useSetApartmentForecast() {
  return useMutation({
    ...trpc.apartment.forecast.set.mutationOptions(),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries(trpc.apartment.forecast.pathFilter()),
        queryClient.invalidateQueries(trpc.apartment.dashboard.pathFilter()),
      ]),
  })
}

import { useMutation } from '@tanstack/react-query'

import { queryClient, trpc } from '@/lib/trpc'

/** Un trajet change les km réels du mois (et le défaut N-1 de l'année suivante). */
const invalidate = () =>
  Promise.all([
    queryClient.invalidateQueries(trpc.professional.pathFilter()),
    queryClient.invalidateQueries(
      trpc.professional.forecast.mileage.queryFilter(),
    ),
  ])

export function useCreateTrip() {
  return useMutation({
    ...trpc.professional.trips.create.mutationOptions(),
    onSuccess: invalidate,
  })
}

export function useDeleteTrip() {
  return useMutation({
    ...trpc.professional.trips.delete.mutationOptions(),
    onSuccess: invalidate,
  })
}

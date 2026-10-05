import { useMutation } from "@tanstack/react-query";

import { queryClient, trpc } from "@/lib/trpc";

/** Un trajet change les km réels du mois (et le défaut N-1 de l'année suivante). */
const invalidate = () =>
  Promise.all([
    queryClient.invalidateQueries(trpc.professional.pathFilter()),
    queryClient.invalidateQueries(trpc.professionalForecast.mileage.queryFilter()),
  ]);

export function useCreateTrip() {
  return useMutation({ ...trpc.trip.create.mutationOptions(), onSuccess: invalidate });
}

export function useDeleteTrip() {
  return useMutation({ ...trpc.trip.delete.mutationOptions(), onSuccess: invalidate });
}

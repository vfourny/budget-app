import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient, trpc } from "@/lib/trpc";

export type BillingSource = "FORECAST" | "ACTUAL";

/** Une saisie du prévisionnel change le dashboard Pro et les autres saisies : on rafraîchit les deux. */
const invalidate = () =>
  Promise.all([
    queryClient.invalidateQueries(trpc.proForecast.pathFilter()),
    queryClient.invalidateQueries(trpc.professional.pathFilter()),
  ]);

/** Clients déjà saisis (autocomplétion) avec leur dernier TJM. */
export function useBillingClients() {
  return useQuery(trpc.proForecast.clients.queryOptions());
}

export function useBillingLines(year: number, month: number, kind: BillingSource) {
  return useQuery(trpc.proForecast.billingLines.queryOptions({ year, month, kind }));
}

export function useSetBillingLines() {
  return useMutation({
    ...trpc.proForecast.setBillingLines.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useCopyBillingToFollowingMonths() {
  return useMutation({
    ...trpc.proForecast.copyBillingToFollowingMonths.mutationOptions(),
    onSuccess: invalidate,
  });
}

export type ForecastGroupName = "charges" | "mixedCosts";

/** Montants prévus d'un groupe : saisie, défaut (N-1) et réel du mois précédent. */
export function useForecasts(year: number, month: number, group: ForecastGroupName) {
  return useQuery(trpc.proForecast.forecasts.queryOptions({ year, month, group }));
}

export function useSetForecasts() {
  return useMutation({ ...trpc.proForecast.setForecasts.mutationOptions(), onSuccess: invalidate });
}

export function useCopyForecastsToFollowingMonths() {
  return useMutation({
    ...trpc.proForecast.copyForecastsToFollowingMonths.mutationOptions(),
    onSuccess: invalidate,
  });
}

/** Km prévus d'un mois (saisie) et km réels du même mois N-1. */
export function useMileageForecast(year: number, month: number) {
  return useQuery(trpc.proForecast.mileage.queryOptions({ year, month }));
}

export function useSetMileage() {
  return useMutation({ ...trpc.proForecast.setMileage.mutationOptions(), onSuccess: invalidate });
}

export function useCopyMileageToFollowingMonths() {
  return useMutation({
    ...trpc.proForecast.copyMileageToFollowingMonths.mutationOptions(),
    onSuccess: invalidate,
  });
}

import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient, trpc } from "@/lib/trpc";
import type { BillingKind } from "@server/generated/prisma/enums";
import type { ForecastGroup } from "@shared/professional-rules";

/** Une saisie du prévisionnel change le dashboard Pro et les autres saisies : on rafraîchit les deux. */
const invalidate = () =>
  Promise.all([
    queryClient.invalidateQueries(trpc.professionalForecast.pathFilter()),
    queryClient.invalidateQueries(trpc.professional.pathFilter()),
  ]);

/** Clients déjà saisis (autocomplétion) avec leur dernier TJM. */
export function useBillingClients() {
  return useQuery(trpc.professionalForecast.clients.queryOptions());
}

export function useBillingLines(year: number, month: number, kind: BillingKind) {
  return useQuery(trpc.professionalForecast.billingLines.queryOptions({ year, month, kind }));
}

export function useSetBillingLines() {
  return useMutation({
    ...trpc.professionalForecast.setBillingLines.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useCopyBillingToFollowingMonths() {
  return useMutation({
    ...trpc.professionalForecast.copyBillingToFollowingMonths.mutationOptions(),
    onSuccess: invalidate,
  });
}

/** Montants prévus d'un groupe : saisie, défaut (N-1) et réel du mois précédent. */
export function useForecasts(year: number, month: number, group: ForecastGroup) {
  return useQuery(trpc.professionalForecast.forecasts.queryOptions({ year, month, group }));
}

export function useSetForecasts() {
  return useMutation({
    ...trpc.professionalForecast.setForecasts.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useCopyForecastsToFollowingMonths() {
  return useMutation({
    ...trpc.professionalForecast.copyForecastsToFollowingMonths.mutationOptions(),
    onSuccess: invalidate,
  });
}

/** Km prévus d'un mois (saisie) et km réels du même mois N-1. */
export function useMileageForecast(year: number, month: number) {
  return useQuery(trpc.professionalForecast.mileage.queryOptions({ year, month }));
}

export function useSetMileage() {
  return useMutation({
    ...trpc.professionalForecast.setMileage.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useCopyMileageToFollowingMonths() {
  return useMutation({
    ...trpc.professionalForecast.copyMileageToFollowingMonths.mutationOptions(),
    onSuccess: invalidate,
  });
}

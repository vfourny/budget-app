import type { BillingKind } from '@server/generated/prisma/enums'
import type { ForecastGroup } from '@shared/professional/professional.rules'
import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient, trpc } from '@/lib/trpc'

/** Une saisie du prévisionnel change le dashboard Pro et les autres saisies : on rafraîchit les deux. */
const invalidate = () =>
  Promise.all([
    queryClient.invalidateQueries(trpc.professional.forecast.pathFilter()),
    queryClient.invalidateQueries(trpc.professional.pathFilter()),
  ])

/** Clients déjà saisis (autocomplétion) avec leur dernier TJM. */
export function useBillingClients() {
  return useQuery(trpc.professional.forecast.clients.queryOptions())
}

export function useBillingLines(
  year: number,
  month: number,
  kind: BillingKind,
) {
  return useQuery(
    trpc.professional.forecast.billingLines.queryOptions({ year, month, kind }),
  )
}

export function useSetBillingLines() {
  return useMutation({
    ...trpc.professional.forecast.setBillingLines.mutationOptions(),
    onSuccess: invalidate,
  })
}

export function useCopyBillingToFollowingMonths() {
  return useMutation({
    ...trpc.professional.forecast.copyBillingToFollowingMonths.mutationOptions(),
    onSuccess: invalidate,
  })
}

/** Montants prévus d'un groupe : saisie, défaut (N-1) et réel du mois précédent. */
export function useForecasts(
  year: number,
  month: number,
  group: ForecastGroup,
) {
  return useQuery(
    trpc.professional.forecast.forecasts.queryOptions({ year, month, group }),
  )
}

export function useSetForecasts() {
  return useMutation({
    ...trpc.professional.forecast.setForecasts.mutationOptions(),
    onSuccess: invalidate,
  })
}

export function useCopyForecastsToFollowingMonths() {
  return useMutation({
    ...trpc.professional.forecast.copyForecastsToFollowingMonths.mutationOptions(),
    onSuccess: invalidate,
  })
}

/** Salaire brut prévu d'un mois (saisie) et brut du même mois N-1. */
export function useSalaryForecast(year: number, month: number) {
  return useQuery(
    trpc.professional.forecast.salary.queryOptions({ year, month }),
  )
}

export function useSetSalary() {
  return useMutation({
    ...trpc.professional.forecast.setSalary.mutationOptions(),
    onSuccess: invalidate,
  })
}

export function useCopySalaryToFollowingMonths() {
  return useMutation({
    ...trpc.professional.forecast.copySalaryToFollowingMonths.mutationOptions(),
    onSuccess: invalidate,
  })
}

/** Km prévus d'un mois (saisie) et km réels du même mois N-1. */
export function useMileageForecast(year: number, month: number) {
  return useQuery(
    trpc.professional.forecast.mileage.queryOptions({ year, month }),
  )
}

export function useSetMileage() {
  return useMutation({
    ...trpc.professional.forecast.setMileage.mutationOptions(),
    onSuccess: invalidate,
  })
}

export function useCopyMileageToFollowingMonths() {
  return useMutation({
    ...trpc.professional.forecast.copyMileageToFollowingMonths.mutationOptions(),
    onSuccess: invalidate,
  })
}

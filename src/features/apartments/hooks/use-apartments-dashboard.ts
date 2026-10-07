import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient, trpc } from "@/lib/trpc";

/** Mois clos proposés par le sélecteur (du plus récent au plus ancien). */
export function useApartmentPeriods() {
  return useQuery(trpc.apartmentDashboard.periods.queryOptions());
}

/** Un mois : colonnes de chaque appartement actif, KPI et transactions rattachées. `apartmentId` = pastille. */
export function useApartmentsMonth(year: number, month: number, apartmentId: string | null) {
  return useQuery(trpc.apartmentDashboard.month.queryOptions({ year, month, apartmentId }));
}

/** Une année : colonnes sur les mois clos, rendements et seuils LMNP. */
export function useApartmentsYear(year: number, apartmentId: string | null) {
  return useQuery(trpc.apartmentDashboard.year.queryOptions({ year, apartmentId }));
}

/** Saisit la facture de gérance d'un mois (R12) puis rafraîchit le dashboard. */
export function useSetManagementInvoice() {
  return useMutation({
    ...trpc.apartment.setManagementInvoice.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries(trpc.apartmentDashboard.pathFilter()),
  });
}

import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc";

/** Mois proposés par le sélecteur (12 mois des années qui ont des données + année en cours). */
export function useProfessionalPeriods() {
  return useQuery(trpc.professional.periods.queryOptions());
}

/** Prévu et réel d'un mois + ses transactions pro validées. */
export function useProfessionalMonth(year: number, month: number) {
  return useQuery(trpc.professional.month.queryOptions({ year, month }));
}

/** Les 12 mois d'une année (vue année). */
export function useProfessionalYear(year: number) {
  return useQuery(trpc.professional.year.queryOptions({ year }));
}

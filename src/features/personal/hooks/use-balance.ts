import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient, trpc } from '@/lib/trpc'

/** Solde du compte perso en début et fin de mois (ou d'année si `month` est absent). */
export function useBalance(year: number, month?: number) {
  return useQuery(trpc.personal.balance.queryOptions({ year, month }))
}

/** Saisit (ou efface avec `null`) le solde réel en fin de mois ; recalcule toutes les périodes. */
export function useSetBalance() {
  return useMutation({
    ...trpc.personal.setBalance.mutationOptions(),
    onSuccess: () =>
      queryClient.invalidateQueries(trpc.personal.balance.queryFilter()),
  })
}

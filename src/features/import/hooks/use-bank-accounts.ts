import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc";

/** Comptes bancaires disponibles pour l'import (≈ un composable `useBankAccounts()` en Vue). */
export function useBankAccounts() {
  return useQuery(trpc.bankAccount.list.queryOptions());
}

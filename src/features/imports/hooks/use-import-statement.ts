import { useMutation } from "@tanstack/react-query";

import type { AccountType } from "@server/generated/prisma/enums";
import type { CsvFormatConfig } from "@shared/csv-format";

import { errorMessage } from "@/lib/errors";
import { queryClient, trpc, trpcClient } from "@/lib/trpc";

/**
 * Importe un relevé CSV puis lance aussitôt la catégorisation IA (≈ un `async function` qui
 * enchaîne deux appels, dans un composable Vue). Si seule la catégorisation échoue, l'import
 * existe quand même : on renvoie `categorizationError` et la relecture montrera les lignes
 * « à catégoriser ».
 */
export function useImportStatement() {
  return useMutation({
    mutationFn: async (input: {
      accountType: AccountType;
      /** Appartement du relevé (compte appartement) ; `null` sinon. */
      apartmentId?: string | null;
      fileName: string;
      csvText: string;
      /** Format confirmé après détection (CSV inconnu) : enregistré par le serveur. */
      format?: { name: string; config: CsvFormatConfig };
    }) => {
      const created = await trpcClient.import.create.mutate(input);

      let categorizationError: string | null = null;
      try {
        await trpcClient.categorize.run.mutate({ batchId: created.batchId });
      } catch (error) {
        categorizationError = errorMessage(error);
      }
      return { ...created, categorizationError };
    },
    onSuccess: () => queryClient.invalidateQueries(trpc.import.list.queryFilter()),
  });
}

import { useQuery } from "@tanstack/react-query";

import { ENVELOPE_ORDER } from "@/lib/envelopes";
import { trpc } from "@/lib/trpc";

/**
 * Hook custom (≈ composable Vue) : lit les catégories via tRPC et les regroupe par enveloppe.
 *
 * `useQuery` gère fetch, cache, loading et erreurs : c'est ce qui remplace le couple
 * `useState` + `useEffect(fetch)` qu'on voit souvent (et qu'on évite ici).
 */
export function useCategoriesByEnvelope() {
  const query = useQuery(trpc.category.list.queryOptions());

  // Valeur dérivée calculée directement pendant le rendu (≈ computed), pas stockée dans un
  // useState. Le calcul est trivial : pas besoin de useMemo.
  const groups = ENVELOPE_ORDER.map((envelope) => ({
    envelope,
    categories: (query.data ?? []).filter((category) => category.envelope === envelope),
  })).filter((group) => group.categories.length > 0);

  return { ...query, groups };
}

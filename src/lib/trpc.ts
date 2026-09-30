import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

// `import type` : seul le type du routeur traverse la frontière front/back, aucun code serveur
// n'est embarqué dans le bundle navigateur.
import type { AppRouter } from "@server/trpc/root";

/** Cache TanStack Query de l'app (≈ un store global de requêtes, avec cache et refetch). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000 },
  },
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
});

/**
 * Point d'accès typé à l'API : `trpc.<domaine>.<proc>.queryOptions()` produit la clé de cache
 * et la fonction de fetch à passer à `useQuery`.
 *
 * Dans une SPA il n'y a qu'un navigateur donc qu'un client : un simple module singleton suffit,
 * pas besoin de Context React (qui sert quand la valeur dépend de l'endroit dans l'arbre).
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({ client: trpcClient, queryClient });

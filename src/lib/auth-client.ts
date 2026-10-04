import { createAuthClient } from "better-auth/react";

/**
 * Client Better Auth (même origine que l'app : `/api/auth`, aucune URL à configurer).
 * `authClient.useSession()` est un hook React ≈ un composable `useSession()` en Vue : il renvoie
 * `{ data, isPending }` et se met à jour tout seul après connexion / déconnexion.
 */
export const authClient = createAuthClient();

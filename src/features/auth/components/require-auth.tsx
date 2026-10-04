import { Center, Loader } from "@mantine/core";
import { Navigate, Outlet } from "react-router";

import { authClient } from "@/lib/auth-client";

/**
 * Garde de routes ≈ `beforeEach` de Vue Router, mais déclaratif : c'est une route « layout » qui
 * n'affiche ses enfants (`<Outlet />`) que si une session existe, sinon renvoie vers `/login`.
 */
export function RequireAuth() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <Center h="100vh">
        <Loader color="gold.6" />
      </Center>
    );
  }
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

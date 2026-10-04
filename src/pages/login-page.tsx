import { Center, Paper } from "@mantine/core";
import { Navigate } from "react-router";

import { PageHeader } from "@/components/page-header";
import { LoginForm } from "@/features/auth/components/login-form";
import { authClient } from "@/lib/auth-client";
import { fr } from "@/lib/i18n/fr";

export function LoginPage() {
  const { data: session, isPending } = authClient.useSession();

  // Déjà connecté : inutile de montrer le formulaire.
  if (!isPending && session) {
    return <Navigate to="/" replace />;
  }

  return (
    <Center mih="100vh" p="md">
      <Paper w="100%" maw={420} p="xl" withBorder>
        <PageHeader eyebrow={fr.auth.eyebrow} title={fr.auth.title} />
        <LoginForm />
      </Paper>
    </Center>
  );
}

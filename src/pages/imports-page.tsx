import { Button } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { Link } from "react-router";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";

export function ImportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Historique"
        title="Imports"
        actions={
          <Button component={Link} to="/imports/nouveau" leftSection={<IconUpload size={16} />}>
            Importer un relevé
          </Button>
        }
      />
      <ComingSoon>
        L'historique des fichiers importés arrivera avec l'écran de relecture.
      </ComingSoon>
    </>
  );
}

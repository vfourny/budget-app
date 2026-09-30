import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { Link } from "react-router";

import { PageHeader } from "@/components/page-header";
import { ImportsTable } from "@/features/imports/components/imports-table";

export function ImportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Historique des fichiers"
        title="Imports"
        actions={
          <Button component={Link} to="/imports/nouveau" leftSection={<IconPlus size={16} />}>
            Nouvel import
          </Button>
        }
      />
      <ImportsTable />
    </>
  );
}

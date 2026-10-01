import { Paper, Stack } from "@mantine/core";

import { PageHeader } from "@/components/page-header";
import { CategoryList } from "@/features/categories/components/category-list";
import { EnvelopeSharesForm } from "@/features/settings/components/envelope-shares-form";

export function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Réglages" />
      <Stack gap={16}>
        <Paper withBorder radius="lg" p={28}>
          <EnvelopeSharesForm />
        </Paper>
        <Paper withBorder radius="lg" p={28}>
          <CategoryList />
        </Paper>
      </Stack>
    </>
  );
}

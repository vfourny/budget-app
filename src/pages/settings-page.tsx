import { Paper } from "@mantine/core";

import { PageHeader } from "@/components/page-header";
import { CategoryList } from "@/features/categories/components/category-list";

export function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Réglages" />
      <Paper withBorder radius="lg" p={28}>
        <CategoryList />
      </Paper>
    </>
  );
}

import { Paper, Stack } from "@mantine/core";

import { PageHeader } from "@/components/page-header";
import { EnvelopeSharesForm } from "@/features/settings/components/envelope-shares-form";
import { IncomeTaxBracketsForm } from "@/features/settings/components/income-tax-brackets-form";
import { fr } from "@/lib/i18n/fr";

export function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow={fr.settings.eyebrow} title={fr.settings.title} />
      <Stack gap={16}>
        <Paper withBorder radius="lg" p={28}>
          <EnvelopeSharesForm />
        </Paper>
        <Paper withBorder radius="lg" p={28}>
          <IncomeTaxBracketsForm />
        </Paper>
      </Stack>
    </>
  );
}

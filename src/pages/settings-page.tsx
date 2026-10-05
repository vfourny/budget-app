import { Paper, Stack, Tabs } from "@mantine/core";
import { useSearchParams } from "react-router";

import { PageHeader } from "@/components/page-header";
import { EnvelopeSharesForm } from "@/features/settings/components/envelope-shares-form";
import { IncomeTaxBracketsForm } from "@/features/settings/components/income-tax-brackets-form";
import { ProfessionalYearSettingsForm } from "@/features/settings/components/professional-year-settings-form";
import { fr } from "@/lib/i18n/fr";

const TABS = ["personal", "professional"] as const;
type SettingsTab = (typeof TABS)[number];

export function SettingsPage() {
  // Onglet dans l'URL (`/settings?tab=professional`) : lien direct depuis le dashboard Pro, et
  // l'onglet survit au rechargement (≈ `useRoute().query.tab` + `router.replace` en Vue).
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab: SettingsTab = TABS.find((value) => value === requested) ?? "personal";

  return (
    <>
      <PageHeader eyebrow={fr.settings.eyebrow} title={fr.settings.title} />
      <Tabs
        value={tab}
        onChange={(value) => value && setSearchParams({ tab: value }, { replace: true })}
        keepMounted={false}
      >
        <Tabs.List mb={16}>
          <Tabs.Tab value="personal">{fr.settings.tabs.personal}</Tabs.Tab>
          <Tabs.Tab value="professional">{fr.settings.tabs.professional}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="personal">
          <Stack gap={16}>
            <Paper withBorder radius="lg" p={28}>
              <EnvelopeSharesForm />
            </Paper>
            <Paper withBorder radius="lg" p={28}>
              <IncomeTaxBracketsForm />
            </Paper>
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="professional">
          <Paper withBorder radius="lg" p={28}>
            <ProfessionalYearSettingsForm />
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

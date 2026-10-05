import { Modal, SegmentedControl, Stack, Tabs } from "@mantine/core";
import { useState } from "react";

import { BillingTab } from "@/features/professional/components/forecast-editor/billing-tab";
import { ChargesTab } from "@/features/professional/components/forecast-editor/charges-tab";
import { MileageTab } from "@/features/professional/components/forecast-editor/mileage-tab";
import { MixedCostsTab } from "@/features/professional/components/forecast-editor/mixed-costs-tab";
import type { BillingSource } from "@/features/professional/hooks/use-forecast-editor";
import type { Period } from "@/hooks/use-period-selection";
import { capitalizedMonthName } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { ProYearSettingsValues } from "@shared/pro-rules";

export type EditorTab = "billing" | "charges" | "mixedCosts" | "mileage";

export interface EditorTarget {
  tab: EditorTab;
  source: BillingSource;
}

interface ForecastEditorModalProps {
  period: Period;
  /** Le mois a un réel : la saisie « Réel » de la facturation est possible. */
  hasActual: boolean;
  /** Règles de l'année (salaire, taux) : rappelées dans l'onglet Charges. */
  settings: ProYearSettingsValues;
  initial: EditorTarget;
  onClose: () => void;
}

/**
 * Modale « Éditer le prévisionnel » d'un mois : un onglet par type de prévision. Montée seulement
 * quand elle est ouverte (le parent la rend sous condition), donc l'état initial vient des props.
 */
export function ForecastEditorModal({
  period,
  hasActual,
  settings,
  initial,
  onClose,
}: ForecastEditorModalProps) {
  const [tab, setTab] = useState<EditorTab>(initial.tab);
  const [source, setSource] = useState<BillingSource>(hasActual ? initial.source : "FORECAST");
  const text = fr.professional.editor;
  const periodLabel = `${capitalizedMonthName(period.month)} ${period.year}`;

  return (
    <Modal
      opened
      onClose={onClose}
      size="xl"
      title={
        source === "ACTUAL" && tab === "billing"
          ? text.actualTitle(periodLabel)
          : text.forecastTitle(periodLabel)
      }
      closeButtonProps={{ "aria-label": text.close }}
    >
      <Tabs
        value={tab}
        onChange={(value) => value && setTab(value as EditorTab)}
        keepMounted={false}
      >
        <Tabs.List aria-label={text.tabsAria} mb={16}>
          <Tabs.Tab value="billing">{text.tabs.billing}</Tabs.Tab>
          <Tabs.Tab value="charges">{text.tabs.charges}</Tabs.Tab>
          <Tabs.Tab value="mixedCosts">{text.tabs.mixedCosts}</Tabs.Tab>
          <Tabs.Tab value="mileage">{text.tabs.mileage}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="billing">
          <Stack gap={16}>
            <SegmentedControl
              w="fit-content"
              aria-label={text.sourceAria}
              value={source}
              onChange={(value) => setSource(value as BillingSource)}
              data={[
                { value: "FORECAST", label: text.source.FORECAST },
                { value: "ACTUAL", label: text.source.ACTUAL, disabled: !hasActual },
              ]}
            />
            <BillingTab period={period} source={source} />
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="charges">
          <ChargesTab period={period} settings={settings} />
        </Tabs.Panel>
        <Tabs.Panel value="mixedCosts">
          <MixedCostsTab period={period} settings={settings} />
        </Tabs.Panel>
        <Tabs.Panel value="mileage">
          <MileageTab period={period} rateMilli={settings.mileageRateMilli} />
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}

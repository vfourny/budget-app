import { Modal, SegmentedControl, Stack, Tabs } from '@mantine/core'
import type { BillingKind } from '@server/generated/prisma/enums'
import type { ProfessionalYearSettingsValues } from '@shared/professional/professional.rules'
import { useState } from 'react'

import { BillingTab } from '@/features/professional/components/forecast-editor/billing-tab'
import { ChargesTab } from '@/features/professional/components/forecast-editor/charges-tab'
import { MileageTab } from '@/features/professional/components/forecast-editor/mileage-tab'
import { MixedCostsTab } from '@/features/professional/components/forecast-editor/mixed-costs-tab'
import { SalaryTab } from '@/features/professional/components/forecast-editor/salary-tab'
import type { Period } from '@/hooks/use-period-selection'
import { capitalizedMonthName } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

export type EditorTab =
  'billing' | 'charges' | 'salary' | 'mixedCosts' | 'mileage'

export interface EditorTarget {
  source: BillingKind
  tab: EditorTab
}

interface ForecastEditorModalProps {
  /** Le mois a un réel : la saisie « Réel » de la facturation est possible. */
  hasActual: boolean
  initial: EditorTarget
  onClose: () => void
  period: Period
  /** Règles de l'année (taux, surfaces, barème km) : utilisées par les onglets. */
  settings: ProfessionalYearSettingsValues
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
  const [tab, setTab] = useState<EditorTab>(initial.tab)
  const [source, setSource] = useState<BillingKind>(
    hasActual ? initial.source : 'FORECAST',
  )
  const text = fr.professional.editor
  const periodLabel = `${capitalizedMonthName(period.month)} ${period.year}`

  return (
    <Modal
      closeButtonProps={{ 'aria-label': text.close }}
      onClose={onClose}
      opened
      size="xl"
      title={
        source === 'ACTUAL' && tab === 'billing'
          ? text.actualTitle(periodLabel)
          : text.forecastTitle(periodLabel)
      }
    >
      <Tabs
        keepMounted={false}
        onChange={(value) => value && setTab(value as EditorTab)}
        value={tab}
      >
        <Tabs.List aria-label={text.tabsAria} mb={16}>
          <Tabs.Tab value="billing">{text.tabs.billing}</Tabs.Tab>
          <Tabs.Tab value="charges">{text.tabs.charges}</Tabs.Tab>
          <Tabs.Tab value="salary">{text.tabs.salary}</Tabs.Tab>
          <Tabs.Tab value="mixedCosts">{text.tabs.mixedCosts}</Tabs.Tab>
          <Tabs.Tab value="mileage">{text.tabs.mileage}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="billing">
          <Stack gap={16}>
            <SegmentedControl
              aria-label={text.sourceAria}
              data={[
                { value: 'FORECAST', label: text.source.FORECAST },
                {
                  value: 'ACTUAL',
                  label: text.source.ACTUAL,
                  disabled: !hasActual,
                },
              ]}
              onChange={(value) => setSource(value as BillingKind)}
              value={source}
              w="fit-content"
            />
            <BillingTab period={period} source={source} />
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="charges">
          <ChargesTab period={period} />
        </Tabs.Panel>
        <Tabs.Panel value="salary">
          <SalaryTab period={period} settings={settings} />
        </Tabs.Panel>
        <Tabs.Panel value="mixedCosts">
          <MixedCostsTab period={period} settings={settings} />
        </Tabs.Panel>
        <Tabs.Panel value="mileage">
          <MileageTab period={period} rateMilli={settings.mileageRateMilli} />
        </Tabs.Panel>
      </Tabs>
    </Modal>
  )
}

import { Text } from '@mantine/core'
import {
  MIXED_COSTS,
  MIXED_COSTS_RATIO,
  mixedShareBp,
  type ProfessionalYearSettingsValues,
} from '@shared/professional/rules'

import { ForecastAmountsForm } from '@/features/professional/components/forecast-editor/forecast-amounts-form'
import type { Period } from '@/hooks/use-period-selection'
import { formatBp, formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

/** Onglet « Frais mixtes » : dépenses perso prévues et part remboursée par Stygma. */
export function MixedCostsTab({
  period,
  settings,
}: {
  period: Period
  settings: ProfessionalYearSettingsValues
}) {
  const text = fr.professional.editor.mixedCosts
  const costs = MIXED_COSTS.map((cost) => ({
    ...cost,
    shareBp: mixedShareBp(settings, cost.allocation),
  }))
  const shareOf = (category: string) =>
    costs.find((cost) => cost.category === category)

  return (
    <ForecastAmountsForm
      extraCells={(category, view) => {
        const cost = shareOf(category)
        if (!cost) return ['', '']
        return [
          <Text c="dimmed" key="key" size="sm">
            {cost.allocation === 'area'
              ? text.areaKey(formatBp(cost.shareBp))
              : text.ratioKey(
                  MIXED_COSTS_RATIO.numerator,
                  MIXED_COSTS_RATIO.denominator,
                )}
          </Text>,
          <Text fw={600} key="share" size="sm">
            {formatCents(
              Math.round((view.valueOf(category) * cost.shareBp) / 10_000),
            )}
          </Text>,
        ]
      }}
      extraHeaders={[text.key, text.share]}
      group="mixedCosts"
      headers={{ category: text.category, amount: text.amount }}
      hint={text.hint}
      period={period}
      reference="lastYear"
      rows={costs.map((cost) => cost.category)}
    >
      {({ view }) => (
        <Text fw={600} size="sm" ta="right">
          {text.total(
            formatCents(
              costs.reduce(
                (total, cost) =>
                  total +
                  Math.round(
                    (view.valueOf(cost.category) * cost.shareBp) / 10_000,
                  ),
                0,
              ),
            ),
          )}
        </Text>
      )}
    </ForecastAmountsForm>
  )
}

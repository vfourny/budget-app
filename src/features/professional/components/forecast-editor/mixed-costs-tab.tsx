import { Text } from "@mantine/core";

import { ForecastAmountsForm } from "@/features/professional/components/forecast-editor/forecast-amounts-form";
import type { Period } from "@/hooks/use-period-selection";
import { formatBp, formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import {
  MIXED_COSTS,
  mixedShareBp,
  type ProfessionalYearSettingsValues,
} from "@shared/professional-rules";

/** Onglet « Frais mixtes » : dépenses perso prévues et part remboursée par Stygma. */
export function MixedCostsTab({
  period,
  settings,
}: {
  period: Period;
  settings: ProfessionalYearSettingsValues;
}) {
  const text = fr.professional.editor.mixedCosts;
  const costs = MIXED_COSTS.map((cost) => ({ ...cost, shareBp: mixedShareBp(settings, cost.key) }));
  const shareOf = (category: string) => costs.find((cost) => cost.category === category);

  return (
    <ForecastAmountsForm
      period={period}
      group="mixedCosts"
      rows={costs.map((cost) => cost.category)}
      reference="lastYear"
      hint={text.hint}
      headers={{ category: text.category, amount: text.amount }}
      extraHeaders={[text.key, text.share]}
      extraCells={(category, view) => {
        const cost = shareOf(category);
        if (!cost) return ["", ""];
        return [
          <Text key="key" size="sm" c="dimmed">
            {cost.key === "area"
              ? text.areaKey(formatBp(cost.shareBp))
              : text.ratioKey(settings.mixedKeyNumerator, settings.mixedKeyDenominator)}
          </Text>,
          <Text key="share" size="sm" fw={600}>
            {formatCents(Math.round((view.valueOf(category) * cost.shareBp) / 10_000))}
          </Text>,
        ];
      }}
    >
      {({ view }) => (
        <Text size="sm" fw={600} ta="right">
          {text.total(
            formatCents(
              costs.reduce(
                (total, cost) =>
                  total + Math.round((view.valueOf(cost.category) * cost.shareBp) / 10_000),
                0,
              ),
            ),
          )}
        </Text>
      )}
    </ForecastAmountsForm>
  );
}

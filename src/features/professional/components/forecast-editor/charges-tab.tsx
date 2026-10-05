import { Group, NumberInput, Paper, Stack, Text } from "@mantine/core";

import { ForecastAmountsForm } from "@/features/professional/components/forecast-editor/forecast-amounts-form";
import type { Period } from "@/hooks/use-period-selection";
import { formatBp, formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { PRO_CHARGE_CATEGORIES, type ProYearSettingsValues } from "@shared/pro-rules";

/** Onglet « Charges & rémunération » : prévu HT par charge pro + BNC prévu. */
export function ChargesTab({
  period,
  settings,
}: {
  period: Period;
  settings: ProYearSettingsValues;
}) {
  const text = fr.professional.editor.charges;
  return (
    <ForecastAmountsForm
      period={period}
      group="charges"
      rows={PRO_CHARGE_CATEGORIES}
      reference="previousMonth"
      hint={text.hint}
    >
      {({ view, setAmount }) => (
        <Stack gap={12}>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {text.mixedNote}
            </Text>
            <Text size="sm" fw={600}>
              {text.total(
                formatCents(PRO_CHARGE_CATEGORIES.reduce((total, c) => total + view.valueOf(c), 0)),
              )}
            </Text>
          </Group>
          <Paper withBorder radius="md" p={16}>
            <Text fw={600} mb={4}>
              {text.remuneration}
            </Text>
            <Text size="xs" c="dimmed" mb={12}>
              {text.salaryNote(
                formatCents(settings.grossSalaryCents),
                formatBp(settings.employerContributionBp),
                formatBp(settings.withholdingTaxBp),
              )}
            </Text>
            <NumberInput
              label={text.bnc}
              description={text.bncHint}
              inputWrapperOrder={["label", "input", "description"]}
              w={260}
              min={0}
              step={100}
              decimalScale={2}
              decimalSeparator=","
              value={view.valueOf("BNC_WITHDRAWAL") / 100}
              onChange={(input) =>
                setAmount(
                  "BNC_WITHDRAWAL",
                  Math.round((typeof input === "number" ? input : 0) * 100),
                )
              }
            />
          </Paper>
        </Stack>
      )}
    </ForecastAmountsForm>
  );
}

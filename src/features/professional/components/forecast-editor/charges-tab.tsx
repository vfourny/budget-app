import { Group, NumberInput, Paper, Stack, Text } from '@mantine/core'
import { PROFESSIONAL_CHARGE_CATEGORIES } from '@shared/professional/rules'

import { ForecastAmountsForm } from '@/features/professional/components/forecast-editor/forecast-amounts-form'
import type { Period } from '@/hooks/use-period-selection'
import { formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

/** Onglet « Charges & BNC » : prévu HT par charge pro + BNC prévu. */
export function ChargesTab({ period }: { period: Period }) {
  const text = fr.professional.editor.charges
  return (
    <ForecastAmountsForm
      group="charges"
      hint={text.hint}
      period={period}
      reference="previousMonth"
      rows={PROFESSIONAL_CHARGE_CATEGORIES}
    >
      {({ view, setAmount }) => (
        <Stack gap={12}>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">
              {text.mixedNote}
            </Text>
            <Text fw={600} size="sm">
              {text.total(
                formatCents(
                  PROFESSIONAL_CHARGE_CATEGORIES.reduce(
                    (total, c) => total + view.valueOf(c),
                    0,
                  ),
                ),
              )}
            </Text>
          </Group>
          <Paper p={16} radius="md" withBorder>
            <Text fw={600} mb={4}>
              {text.remuneration}
            </Text>
            <Text c="dimmed" mb={12} size="xs">
              {text.salaryNote}
            </Text>
            <NumberInput
              decimalScale={2}
              decimalSeparator=","
              description={text.bncHint}
              inputWrapperOrder={['label', 'input', 'description']}
              label={text.bnc}
              min={0}
              onChange={(input) =>
                setAmount(
                  'BNC_WITHDRAWAL',
                  Math.round((typeof input === 'number' ? input : 0) * 100),
                )
              }
              step={100}
              value={view.valueOf('BNC_WITHDRAWAL') / 100}
              w={260}
            />
          </Paper>
        </Stack>
      )}
    </ForecastAmountsForm>
  )
}

import { Group, Paper, Stack, Text, Title } from '@mantine/core'

import { TargetGauge } from '@/components/target-gauge'
import { formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'
import type { RouterOutputs } from '@/lib/trpc'

type Thresholds = NonNullable<
  RouterOutputs['apartment']['dashboard']['year']['thresholds']
>

/**
 * Seuils LMNP (R10), tous appartements confondus : recettes de l'année vs plafond micro-BIC et vs
 * seuil LMP. Indicatif : à valider avec le comptable.
 */
export function LmnpThresholds({ thresholds }: { thresholds: Thresholds }) {
  const text = fr.apartments.thresholds
  const receipts = formatCents(thresholds.receiptsCents)
  const gauges = [
    {
      key: 'microBic',
      name: text.microBic,
      of: text.microBicOf(formatCents(thresholds.microBicCeilingCents)),
      limit: thresholds.microBicCeilingCents,
    },
    {
      key: 'lmp',
      name: text.lmp,
      of: text.lmpOf(formatCents(thresholds.lmpThresholdCents)),
      limit: thresholds.lmpThresholdCents,
    },
  ]

  return (
    <Paper
      aria-label={text.title}
      component="section"
      p={24}
      radius="lg"
      withBorder
    >
      <Stack gap={16}>
        <Title order={2}>{text.title}</Title>
        <Text c="dimmed" size="sm">
          {text.receipts(receipts)} ·{' '}
          {text.projection(formatCents(thresholds.projectedCents))}
        </Text>
        {gauges.map((gauge) => (
          <Stack gap={6} key={gauge.key}>
            <Group justify="space-between">
              <Text fw={600} size="sm">
                {gauge.name}
              </Text>
              <Text
                c={
                  thresholds.receiptsCents > gauge.limit ? 'amber.4' : 'dimmed'
                }
                size="sm"
              >
                {gauge.of}
                {thresholds.receiptsCents > gauge.limit && ` · ${text.over}`}
              </Text>
            </Group>
            <TargetGauge
              ariaLabel={text.gaugeAria(
                gauge.name,
                receipts,
                formatCents(gauge.limit),
              )}
              goal="atMost"
              real={thresholds.receiptsCents}
              target={gauge.limit}
            />
          </Stack>
        ))}
        <Text c="dimmed" size="xs">
          {text.note}
        </Text>
      </Stack>
    </Paper>
  )
}

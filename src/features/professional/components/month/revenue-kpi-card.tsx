import { Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core'
import type { ProfessionalMonth } from '@server/lib/professional/types'
import { COLLECTED_VAT_BP } from '@shared/professional-rules'

import { DeltaBadge } from '@/components/delta-badge'
import { InfoTip } from '@/components/info-tip'
import { TargetGauge } from '@/components/target-gauge'
import { formatCents, formatDays } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

interface Stat {
  color?: string
  label: string
  sub?: string
  value: string
}

/**
 * Carte « CA HT » : réel (ou prévu pour un mois à venir), jauge réel vs prévu, écart, puis
 * facturé / encaissé / reste à encaisser / jours.
 */
export function RevenueKpiCard({ month }: { month: ProfessionalMonth }) {
  const { revenue, billing } = month
  const text = fr.professional.revenue
  const invoiceCount = billing.clients.filter(
    (client) => (client.actual?.amountCents ?? 0) > 0,
  ).length
  // TTC prévu = HT prévu + TVA collectée (même règle que la carte TVA).
  const forecastTtc =
    revenue.forecast +
    Math.round((revenue.forecast * COLLECTED_VAT_BP) / 10_000)

  const stats: Stat[] = month.hasActual
    ? [
        {
          label: text.invoiced,
          value: formatCents(billing.invoicedCents),
          sub: text.invoicedSub(invoiceCount),
        },
        {
          label: text.collected,
          value: formatCents(billing.collectedTtcCents),
          sub: text.collectedSub,
          color: 'teal.4',
        },
        {
          label: text.remaining,
          value: formatCents(billing.receivablesCents ?? 0),
          sub: text.remainingSub,
          color: (billing.receivablesCents ?? 0) > 0 ? 'red.4' : undefined,
        },
        {
          label: text.days,
          value: fr.professional.days(formatDays(billing.days)),
        },
      ]
    : [
        {
          label: text.toInvoice,
          value: formatCents(revenue.forecast),
          sub: text.ht,
        },
        { label: text.collected, value: '—', sub: text.nothingBeforeEnd },
        {
          label: text.toInvoiceTtc,
          value: formatCents(forecastTtc),
          sub: text.forecastTtc,
        },
        {
          label: text.days,
          value: fr.professional.days(formatDays(billing.days)),
        },
      ]

  return (
    <Paper h="100%" p={24} radius="lg" withBorder>
      <Stack gap={8}>
        <Group gap={4}>
          <Text c="dimmed" size="sm">
            {text.title}
          </Text>
          <InfoTip
            ariaLabel={fr.professional.howComputed(text.title)}
            label={text.tip}
          />
        </Group>
        <Text
          c={revenue.actual === null ? 'dimmed' : 'gold.6'}
          fw={600}
          fz={30}
          lh={1.1}
        >
          {formatCents(revenue.actual ?? revenue.forecast)}
        </Text>
        <TargetGauge
          ariaLabel={text.gaugeAria(
            formatCents(revenue.actual ?? 0),
            formatCents(revenue.forecast),
          )}
          goal="atLeast"
          real={revenue.actual}
          target={revenue.forecast}
        />
        <Group gap={8}>
          <Text c="dimmed" size="xs">
            {revenue.actual === null
              ? fr.professional.forecastLabel
              : fr.professional.forecastValue(formatCents(revenue.forecast))}
          </Text>
          {revenue.actual !== null && (
            <DeltaBadge
              actual={revenue.actual}
              forecast={revenue.forecast}
              goal="atLeast"
            />
          )}
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 4 }} mt={12} spacing={16}>
          {stats.map((stat) => (
            <div key={stat.label}>
              <Text c="dimmed" size="xs">
                {stat.label}
              </Text>
              <Text c={stat.color} fw={600}>
                {stat.value}
              </Text>
              {stat.sub && (
                <Text c="dimmed" size="xs">
                  {stat.sub}
                </Text>
              )}
            </div>
          ))}
        </SimpleGrid>
      </Stack>
    </Paper>
  )
}

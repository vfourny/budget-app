import { Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";

import { DeltaBadge } from "@/components/delta-badge";
import { InfoTip } from "@/components/info-tip";
import { TargetGauge } from "@/components/target-gauge";
import { formatCents, formatHalfDays } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { COLLECTED_VAT_BP } from "@shared/pro-rules";
import type { ProMonth } from "@server/lib/pro/types";

interface Stat {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

/**
 * Carte « CA HT » : réel (ou prévu pour un mois à venir), jauge réel vs prévu, écart, puis
 * facturé / encaissé / reste à encaisser / jours.
 */
export function RevenueKpiCard({ month }: { month: ProMonth }) {
  const { revenue, billing } = month;
  const text = fr.professional.revenue;
  const invoiceCount = billing.clients.filter(
    (client) => (client.actual?.amountCents ?? 0) > 0,
  ).length;
  // TTC prévu = HT prévu + TVA collectée (même règle que la carte TVA).
  const forecastTtc = revenue.forecast + Math.round((revenue.forecast * COLLECTED_VAT_BP) / 10_000);

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
          sub: text.ttc,
          color: "teal.4",
        },
        {
          label: text.remaining,
          value: formatCents(billing.remainingTtcCents),
          sub: text.ttc,
          color: billing.remainingTtcCents > 0 ? "red.4" : undefined,
        },
        { label: text.days, value: fr.professional.days(formatHalfDays(billing.halfDays)) },
      ]
    : [
        { label: text.toInvoice, value: formatCents(revenue.forecast), sub: text.ht },
        { label: text.collected, value: "—", sub: text.nothingBeforeEnd },
        { label: text.remaining, value: formatCents(forecastTtc), sub: text.forecastTtc },
        { label: text.days, value: fr.professional.days(formatHalfDays(billing.halfDays)) },
      ];

  return (
    <Paper withBorder radius="lg" p={24} h="100%">
      <Stack gap={8}>
        <Group gap={4}>
          <Text size="sm" c="dimmed">
            {text.title}
          </Text>
          <InfoTip label={text.tip} ariaLabel={fr.professional.howComputed(text.title)} />
        </Group>
        <Text fz={30} fw={600} lh={1.1} c={revenue.actual === null ? "dimmed" : "gold.6"}>
          {formatCents(revenue.actual ?? revenue.forecast)}
        </Text>
        <TargetGauge
          real={revenue.actual}
          target={revenue.forecast}
          goal="atLeast"
          ariaLabel={text.gaugeAria(
            formatCents(revenue.actual ?? 0),
            formatCents(revenue.forecast),
          )}
        />
        <Group gap={8}>
          <Text size="xs" c="dimmed">
            {revenue.actual === null
              ? fr.professional.forecastLabel
              : fr.professional.forecastValue(formatCents(revenue.forecast))}
          </Text>
          {revenue.actual !== null && (
            <DeltaBadge actual={revenue.actual} forecast={revenue.forecast} goal="atLeast" />
          )}
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={16} mt={12}>
          {stats.map((stat) => (
            <div key={stat.label}>
              <Text size="xs" c="dimmed">
                {stat.label}
              </Text>
              <Text fw={600} c={stat.color}>
                {stat.value}
              </Text>
              {stat.sub && (
                <Text size="xs" c="dimmed">
                  {stat.sub}
                </Text>
              )}
            </div>
          ))}
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}

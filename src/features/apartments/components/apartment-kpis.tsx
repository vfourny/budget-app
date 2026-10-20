import { Grid, Group, Stack, Text } from '@mantine/core'

import { InfoTip } from '@/components/info-tip'
import { KpiCard } from '@/components/kpi-card'
import { TargetGauge } from '@/components/target-gauge'
import { formatBp, formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'
import type { RouterOutputs } from '@/lib/trpc'

type Kpis = RouterOutputs['apartment']['dashboard']['month']['kpis']

/**
 * Les deux KPI de l'écran (R8) : loyers nets perçus (jauge perçus bruts / dus) et effort d'épargne
 * nécessaire (jauge apport réel / effort).
 */
export function ApartmentKpis({
  kpis,
  view,
}: {
  kpis: Kpis
  view: 'month' | 'year'
}) {
  const { rent, effort } = kpis
  const text = fr.apartments.kpis
  const percent =
    rent.dueCents > 0
      ? formatBp(Math.round((rent.grossReceivedCents / rent.dueCents) * 10_000))
      : '—'
  const missingRent = rent.dueCents - rent.grossReceivedCents
  const surplus = effort.contributionCents - effort.actualCents

  return (
    <Grid align="stretch" gap={16}>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <KpiCard
          hint={text.rent.hint(
            formatCents(rent.grossReceivedCents),
            formatCents(rent.dueCents),
            percent,
            formatCents(rent.managementFeesCents),
          )}
          label={
            <Group gap={4} wrap="nowrap">
              {text.rent.label}
              <InfoTip
                ariaLabel={fr.professional.howComputed(text.rent.label)}
                label={text.rent.tip}
              />
            </Group>
          }
          value={formatCents(rent.netReceivedCents)}
        >
          <Stack gap={6}>
            <TargetGauge
              ariaLabel={text.rent.gaugeAria(
                formatCents(rent.grossReceivedCents),
                formatCents(rent.dueCents),
              )}
              goal="atLeast"
              real={rent.grossReceivedCents}
              target={rent.dueCents}
            />
            <Text c={missingRent > 0 ? 'amber.4' : 'teal.4'} size="xs">
              {missingRent > 0
                ? text.rent.missing(formatCents(missingRent))
                : text.rent.complete}
            </Text>
          </Stack>
        </KpiCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <KpiCard
          hint={
            effort.actualCents === 0 && effort.forecastCents === 0
              ? text.effort.none
              : view === 'year'
                ? text.effort.hintYear(
                    formatCents(effort.perMonthCents),
                    formatCents(effort.forecastCents),
                  )
                : text.effort.hintMonth(formatCents(effort.forecastCents))
          }
          label={
            <Group gap={4} wrap="nowrap">
              {text.effort.label}
              <InfoTip
                ariaLabel={fr.professional.howComputed(text.effort.label)}
                label={text.effort.tip}
              />
            </Group>
          }
          value={formatCents(effort.actualCents)}
        >
          {effort.actualCents > 0 && (
            <Stack gap={6}>
              <TargetGauge
                ariaLabel={text.effort.gaugeAria(
                  formatCents(effort.contributionCents),
                  formatCents(effort.actualCents),
                )}
                goal="atLeast"
                real={effort.contributionCents}
                target={effort.actualCents}
              />
              <Text c={surplus >= 0 ? 'teal.4' : 'amber.4'} size="xs">
                {surplus >= 0
                  ? text.effort.covered(formatCents(surplus))
                  : text.effort.missing(formatCents(-surplus))}
              </Text>
            </Stack>
          )}
        </KpiCard>
      </Grid.Col>
    </Grid>
  )
}

import { Grid, Group, Stack, Text } from "@mantine/core";

import { InfoTip } from "@/components/info-tip";
import { KpiCard } from "@/components/kpi-card";
import { TargetGauge } from "@/components/target-gauge";
import { formatBp, formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { RouterOutputs } from "@/lib/trpc";

type Kpis = RouterOutputs["apartmentDashboard"]["month"]["kpis"];

/**
 * Les deux KPI de l'écran (R8) : loyers nets perçus (jauge perçus bruts / dus) et effort d'épargne
 * nécessaire (jauge apport réel / effort).
 */
export function ApartmentKpis({ kpis }: { kpis: Kpis }) {
  const { rent, effort } = kpis;
  const text = fr.apartments.kpis;
  const percent =
    rent.dueCents > 0
      ? formatBp(Math.round((rent.grossReceivedCents / rent.dueCents) * 10_000))
      : "—";
  const missingRent = rent.dueCents - rent.grossReceivedCents;
  const surplus = effort.contributionCents - effort.actualCents;

  return (
    <Grid gap={16} align="stretch">
      <Grid.Col span={{ base: 12, md: 6 }}>
        <KpiCard
          label={
            <Group gap={4} wrap="nowrap">
              {text.rent.label}
              <InfoTip
                label={text.rent.tip}
                ariaLabel={fr.professional.howComputed(text.rent.label)}
              />
            </Group>
          }
          value={formatCents(rent.netReceivedCents)}
          hint={text.rent.hint(
            formatCents(rent.grossReceivedCents),
            formatCents(rent.dueCents),
            percent,
            formatCents(rent.managementFeesCents),
          )}
        >
          <Stack gap={6}>
            <TargetGauge
              real={rent.grossReceivedCents}
              target={rent.dueCents}
              goal="atLeast"
              ariaLabel={text.rent.gaugeAria(
                formatCents(rent.grossReceivedCents),
                formatCents(rent.dueCents),
              )}
            />
            <Text size="xs" c={missingRent > 0 ? "amber.4" : "teal.4"}>
              {missingRent > 0 ? text.rent.missing(formatCents(missingRent)) : text.rent.complete}
            </Text>
          </Stack>
        </KpiCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <KpiCard
          label={
            <Group gap={4} wrap="nowrap">
              {text.effort.label}
              <InfoTip
                label={text.effort.tip}
                ariaLabel={fr.professional.howComputed(text.effort.label)}
              />
            </Group>
          }
          value={formatCents(effort.actualCents)}
          hint={
            effort.actualCents === 0 && effort.forecastCents === 0
              ? text.effort.none
              : text.effort.hintMonth(formatCents(effort.forecastCents))
          }
        >
          {effort.actualCents > 0 && (
            <Stack gap={6}>
              <TargetGauge
                real={effort.contributionCents}
                target={effort.actualCents}
                goal="atLeast"
                ariaLabel={text.effort.gaugeAria(
                  formatCents(effort.contributionCents),
                  formatCents(effort.actualCents),
                )}
              />
              <Text size="xs" c={surplus >= 0 ? "teal.4" : "amber.4"}>
                {surplus >= 0
                  ? text.effort.covered(formatCents(surplus))
                  : text.effort.missing(formatCents(-surplus))}
              </Text>
            </Stack>
          )}
        </KpiCard>
      </Grid.Col>
    </Grid>
  );
}

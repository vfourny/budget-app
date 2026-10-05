import { Badge, Group, Paper, Stack, Text, Title } from "@mantine/core";

import { InfoTip } from "@/components/info-tip";
import { TargetGauge } from "@/components/target-gauge";
import { formatBp, formatCents, formatSquareMeters } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { MixedCostRow, ProMonth } from "@server/lib/pro/types";

type Status = keyof typeof fr.professional.mixedCosts.status;

const STATUS_COLOR = {
  forecast: "gray",
  paid: "teal",
  partial: "red",
  toRefund: "red",
} as const satisfies Record<Status, string>;

function statusOf(row: MixedCostRow): Status {
  if (row.paidCents === null) return "forecast";
  const due = row.due.actual ?? 0;
  if (row.paidCents >= due) return "paid";
  return row.paidCents > 0 ? "partial" : "toRefund";
}

/**
 * « Frais mixtes perso → pro » : loyer, internet, téléphone, énergie payés en perso ; part due par
 * Stygma (prorata surface ou clé n/d) et remboursements reçus, ligne par ligne.
 */
export function MixedCostsCard({ month }: { month: ProMonth }) {
  const text = fr.professional.mixedCosts;
  const { settings } = month;
  const areaShare = month.mixedCosts.rows.find((row) => row.keyType === "area")?.shareBp ?? 0;
  const areaText = text.areaKey(
    formatSquareMeters(settings.officeAreaDm2),
    formatSquareMeters(settings.homeAreaDm2),
    formatBp(areaShare),
  );
  const ratioText = text.ratioKey(settings.mixedKeyNumerator, settings.mixedKeyDenominator);
  const left = month.mixedCosts.leftToRefundCents;

  return (
    <Paper withBorder radius="lg" p={24} component="section" aria-label={text.title}>
      <Group gap={4} wrap="nowrap">
        <Title order={2}>{text.title}</Title>
        <InfoTip
          label={text.tip(areaText, ratioText)}
          ariaLabel={fr.professional.howComputed(text.title)}
        />
      </Group>
      <Text size="sm" c="dimmed" mb={16}>
        {text.description}
      </Text>
      <Stack gap={14}>
        {month.mixedCosts.rows.map((row) => {
          const status = statusOf(row);
          const label = fr.categories[row.category];
          const due = row.due.actual ?? row.due.forecast;
          const key = row.keyType === "area" ? areaText : ratioText;
          return (
            <div key={row.category}>
              <Group justify="space-between" mb={4} wrap="nowrap">
                <Group gap={6} wrap="nowrap">
                  <Text size="sm">{label}</Text>
                  <InfoTip
                    label={text.lineTip(
                      formatCents(row.spent.actual ?? row.spent.forecast),
                      formatCents(due),
                      key,
                    )}
                    ariaLabel={fr.professional.howComputed(label)}
                  />
                  {/* Rien à rembourser (pas de dépense ce mois-ci) : pas de statut. */}
                  {due > 0 && (
                    <Badge size="sm" variant="light" color={STATUS_COLOR[status]} tt="none">
                      {text.status[status]}
                    </Badge>
                  )}
                </Group>
                <Text size="sm" fw={600}>
                  {row.paidCents === null
                    ? text.forecastDue(formatCents(due))
                    : text.paidOfDue(formatCents(row.paidCents), formatCents(due))}
                </Text>
              </Group>
              <TargetGauge
                real={row.paidCents}
                target={due}
                goal="atLeast"
                ariaLabel={text.gaugeAria(label, formatCents(row.paidCents ?? 0), formatCents(due))}
              />
            </div>
          );
        })}
      </Stack>
      <Group
        justify="space-between"
        mt={20}
        pt={12}
        style={{ borderTop: "1px solid var(--app-border)" }}
      >
        <Text size="sm" c="dimmed">
          {text.left}
        </Text>
        <Text fw={700} c={month.hasActual && left > 0 ? "red.4" : "teal.4"}>
          {formatCents(left)}
        </Text>
      </Group>
    </Paper>
  );
}

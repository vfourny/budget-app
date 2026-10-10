import { Group, Paper, Stack, Text, Title } from "@mantine/core";

import { TargetGauge } from "@/components/target-gauge";
import { formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { RouterOutputs } from "@/lib/trpc";

type Thresholds = NonNullable<RouterOutputs["apartmentDashboard"]["year"]["thresholds"]>;

/**
 * Seuils LMNP (R10), tous appartements confondus : recettes de l'année vs plafond micro-BIC et vs
 * seuil LMP. Indicatif : à valider avec le comptable.
 */
export function LmnpThresholds({ thresholds }: { thresholds: Thresholds }) {
  const text = fr.apartments.thresholds;
  const receipts = formatCents(thresholds.receiptsCents);
  const gauges = [
    {
      key: "microBic",
      name: text.microBic,
      of: text.microBicOf(formatCents(thresholds.microBicCeilingCents)),
      limit: thresholds.microBicCeilingCents,
    },
    {
      key: "lmp",
      name: text.lmp,
      of: text.lmpOf(formatCents(thresholds.lmpThresholdCents)),
      limit: thresholds.lmpThresholdCents,
    },
  ];

  return (
    <Paper withBorder radius="lg" p={24} component="section" aria-label={text.title}>
      <Stack gap={16}>
        <Title order={2}>{text.title}</Title>
        <Text size="sm" c="dimmed">
          {text.receipts(receipts)} · {text.projection(formatCents(thresholds.projectedCents))}
        </Text>
        {gauges.map((gauge) => (
          <Stack key={gauge.key} gap={6}>
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                {gauge.name}
              </Text>
              <Text size="sm" c={thresholds.receiptsCents > gauge.limit ? "amber.4" : "dimmed"}>
                {gauge.of}
                {thresholds.receiptsCents > gauge.limit && ` · ${text.over}`}
              </Text>
            </Group>
            <TargetGauge
              real={thresholds.receiptsCents}
              target={gauge.limit}
              goal="atMost"
              ariaLabel={text.gaugeAria(gauge.name, receipts, formatCents(gauge.limit))}
            />
          </Stack>
        ))}
        <Text size="xs" c="dimmed">
          {text.note}
        </Text>
      </Stack>
    </Paper>
  );
}

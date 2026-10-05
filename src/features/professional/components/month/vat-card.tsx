import { Group, Paper, Progress, Stack, Text } from "@mantine/core";

import { InfoTip } from "@/components/info-tip";
import { AmountFigure } from "@/features/professional/components/amount-figure";
import { formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { Amount, ProMonth } from "@server/lib/pro/types";

/** Carte « TVA à reverser » : collectée − déductible = à reverser, prévu vs réel. */
export function VatCard({ month }: { month: ProMonth }) {
  const { vat } = month;
  const text = fr.professional.vat;
  const shown = (amount: Amount) => amount.actual ?? amount.forecast;
  const scale = Math.max(vat.collected.forecast, shown(vat.collected), 1);

  const lines = [
    {
      label: text.collected,
      tip: text.collectedTip,
      amount: vat.collected,
      goal: "atLeast",
      color: "gold",
    },
    {
      label: text.deductible,
      tip: text.deductibleTip,
      amount: vat.deductible,
      goal: "atLeast",
      color: "blue",
    },
    { label: text.due, tip: text.dueTip, amount: vat.due, goal: "atMost", color: "gray" },
  ] as const;

  return (
    <Paper withBorder radius="lg" p={24} h="100%">
      <Stack gap={16}>
        <div>
          <Group gap={4}>
            <Text size="sm" c="dimmed">
              {text.title}
            </Text>
            <InfoTip label={text.tip} ariaLabel={fr.professional.howComputed(text.title)} />
          </Group>
          <Text fz={30} fw={600} lh={1.1} c={vat.due.actual === null ? "dimmed" : undefined}>
            {formatCents(shown(vat.due))}
          </Text>
        </div>
        {lines.map((line) => (
          <Stack key={line.label} gap={6}>
            <AmountFigure label={line.label} tip={line.tip} amount={line.amount} goal={line.goal} />
            <Progress
              value={(Math.max(0, shown(line.amount)) / scale) * 100}
              color={line.color}
              size="sm"
              aria-hidden
            />
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

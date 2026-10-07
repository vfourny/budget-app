import { Group, Progress, Text } from "@mantine/core";

import { formatBp, formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

/** Jauge « Capital remboursé » : « 15 368 € sur 166 357 € · 9,2 % » (d'après le tableau d'amortissement, R6). */
export function LoanGauge({
  repaidCents,
  principalCents,
}: {
  repaidCents: number;
  principalCents: number;
}) {
  const text = fr.apartments.card;
  const ratio = principalCents > 0 ? repaidCents / principalCents : 0;
  const percent = formatBp(Math.round(ratio * 10_000));
  return (
    <div>
      <Group justify="space-between" mb={6} gap={12}>
        <Text size="sm" c="dimmed">
          {text.capitalRepaid}
        </Text>
        <Text size="sm" fw={600}>
          {text.capitalOf(formatCents(repaidCents), formatCents(principalCents), percent)}
        </Text>
      </Group>
      <Progress value={ratio * 100} color="gold" size="sm" aria-label={text.capitalAria(percent)} />
    </div>
  );
}

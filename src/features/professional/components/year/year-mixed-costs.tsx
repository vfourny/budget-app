import { Group, Paper, Stack, Text, Title } from "@mantine/core";

import { TargetGauge } from "@/components/target-gauge";
import { formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { ProMonth } from "@server/lib/pro/types";

/** « Frais mixtes · année » : par frais, prévu de l'année, payé en perso, dû, remboursé, reste. */
export function YearMixedCosts({ months }: { months: readonly ProMonth[] }) {
  const text = fr.professional.year.mixedCosts;
  const actualMonths = months.filter((month) => month.hasActual);
  const categories = months[0]?.mixedCosts.rows.map((row) => row.category) ?? [];

  const lines = categories.map((category, index) => {
    const sum = (
      list: readonly ProMonth[],
      pick: (row: ProMonth["mixedCosts"]["rows"][number]) => number,
    ) => list.reduce((total, month) => total + pick(month.mixedCosts.rows[index]), 0);
    const due = sum(actualMonths, (row) => row.due.actual ?? 0);
    const paid = sum(actualMonths, (row) => row.paidCents ?? 0);
    return {
      category,
      yearForecast: sum(months, (row) => row.due.actual ?? row.due.forecast),
      spent: sum(actualMonths, (row) => row.spent.actual ?? 0),
      due,
      paid,
      left: Math.max(0, due - paid),
    };
  });
  const left = lines.reduce((total, line) => total + line.left, 0);

  return (
    <Paper withBorder radius="lg" p={24} component="section" aria-label={text.title}>
      <Title order={2}>{text.title}</Title>
      <Text size="sm" c="dimmed" mb={16}>
        {text.description}
      </Text>
      <Stack gap={14}>
        {lines.map((line) => (
          <div key={line.category}>
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                {fr.categories[line.category]}
              </Text>
              <Text size="xs" c="dimmed">
                {text.yearForecast(formatCents(line.yearForecast))}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                {text.spent(formatCents(line.spent))}
              </Text>
              <Text size="xs" c="dimmed">
                {text.due(formatCents(line.due))}
              </Text>
            </Group>
            <Text size="sm" mb={4} c={line.left > 0 ? "red.4" : "teal.4"}>
              {text.paid(formatCents(line.paid), formatCents(line.left))}
            </Text>
            <TargetGauge
              real={line.paid}
              target={line.due}
              goal="atLeast"
              ariaLabel={fr.professional.mixedCosts.gaugeAria(
                fr.categories[line.category],
                formatCents(line.paid),
                formatCents(line.due),
              )}
            />
          </div>
        ))}
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
        <Text fw={700} c={left > 0 ? "red.4" : "teal.4"}>
          {formatCents(left)}
        </Text>
      </Group>
    </Paper>
  );
}

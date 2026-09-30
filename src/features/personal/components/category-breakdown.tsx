import { Group, Paper, Progress, Stack, Text, Title } from "@mantine/core";

import { TRANSACTION_CATEGORIES } from "@/lib/categories";
import { formatCents } from "@/lib/format";
import type { TransactionCategory } from "@server/generated/prisma/enums";

interface CategoryBreakdownProps {
  overview: {
    expenseCents: number;
    byCategory: { category: TransactionCategory | null; expenseCents: number }[];
  };
}

/** Dépenses par catégorie, la plus grosse en premier ; la barre est relative à la plus grosse. */
export function CategoryBreakdown({ overview }: CategoryBreakdownProps) {
  const max = overview.byCategory[0]?.expenseCents ?? 0;

  return (
    <Paper withBorder radius="lg" p={28} mt={16}>
      <Title order={2} mb={20}>
        Par catégorie
      </Title>
      {overview.byCategory.length === 0 ? (
        <Text c="dimmed">Aucune dépense sur cette période.</Text>
      ) : (
        <Stack gap={16}>
          {overview.byCategory.map(({ category, expenseCents }) => (
            <div key={category ?? "none"}>
              <Group justify="space-between" mb={6}>
                <Text size="sm">
                  {category ? TRANSACTION_CATEGORIES[category].label : "Sans catégorie"}
                </Text>
                <Text size="sm" fw={600}>
                  {formatCents(expenseCents)}
                  <Text span size="xs" c="dimmed" ml={8}>
                    {Math.round((expenseCents / overview.expenseCents) * 100)} %
                  </Text>
                </Text>
              </Group>
              <Progress value={(expenseCents / max) * 100} color="gold" size="sm" />
            </div>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

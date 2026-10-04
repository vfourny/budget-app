import { Group, Paper, Progress, Stack, Text, Title } from "@mantine/core";

import { CATEGORY_CARD_CATEGORIES } from "@/lib/budget-rules";
import { TRANSACTION_CATEGORIES } from "@/lib/categories";
import { formatCents } from "@/lib/format";
import type { TransactionCategory } from "@server/generated/prisma/enums";

interface CategoryBreakdownProps {
  overview: {
    debitsByCategory: { category: TransactionCategory | null; cents: number }[];
  };
}

const SHOWN = new Set<TransactionCategory | null>(CATEGORY_CARD_CATEGORIES);

/**
 * Débits par catégorie, le plus gros en premier ; la barre est relative au plus gros, le % au
 * total affiché. Les catégories affichées se règlent dans `CATEGORY_CARD_CATEGORIES` (budget-rules).
 */
export function CategoryBreakdown({ overview }: CategoryBreakdownProps) {
  const rows = overview.debitsByCategory.filter(({ category }) => SHOWN.has(category));
  const max = rows[0]?.cents ?? 0;
  const total = rows.reduce((sum, row) => sum + row.cents, 0);

  return (
    <Paper withBorder radius="lg" p={28}>
      <Title order={2} mb={20}>
        Par catégorie
      </Title>
      {rows.length === 0 ? (
        <Text c="dimmed">Aucune dépense sur cette période.</Text>
      ) : (
        <Stack gap={16}>
          {rows.map(({ category, cents }) => (
            <div key={category ?? "none"}>
              <Group justify="space-between" mb={6}>
                <Text size="sm">
                  {category ? TRANSACTION_CATEGORIES[category].label : "Sans catégorie"}
                </Text>
                <Text size="sm" fw={600}>
                  {formatCents(cents)}
                  <Text span size="xs" c="dimmed" ml={8}>
                    {Math.round((cents / total) * 100)} %
                  </Text>
                </Text>
              </Group>
              <Progress value={(cents / max) * 100} color="gold" size="sm" />
            </div>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

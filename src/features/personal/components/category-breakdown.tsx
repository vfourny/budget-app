import { Group, Paper, Progress, Stack, Text, Title } from "@mantine/core";

import { CATEGORY_CARD_CATEGORIES } from "@shared/budget-rules";
import { formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { TransactionCategory } from "@server/generated/prisma/enums";

interface CategoryBreakdownProps {
  overview: {
    debitsByCategory: { category: TransactionCategory | null; cents: number }[];
  };
}

/**
 * Débits par catégorie, le plus gros en premier ; la barre est relative au plus gros, le % au
 * total affiché. Toutes les catégories de `CATEGORY_CARD_CATEGORIES` (budget-rules) sont
 * affichées, même à 0 € (elles restent alors dans l'ordre de la liste, en fin de tableau).
 */
export function CategoryBreakdown({ overview }: CategoryBreakdownProps) {
  const rows = CATEGORY_CARD_CATEGORIES.map((category) => ({
    category,
    cents: overview.debitsByCategory.find((debit) => debit.category === category)?.cents ?? 0,
  })).sort((a, b) => b.cents - a.cents);
  const max = rows[0]?.cents ?? 0;
  const total = rows.reduce((sum, row) => sum + row.cents, 0);

  return (
    <Paper withBorder radius="lg" p={28}>
      <Title order={2} mb={20}>
        {fr.personal.breakdown.title}
      </Title>
      <Stack gap={16}>
        {rows.map(({ category, cents }) => (
          <div key={category}>
            <Group justify="space-between" mb={6}>
              <Text size="sm">{fr.categories[category]}</Text>
              <Text size="sm" fw={600}>
                {formatCents(cents)}
                <Text span size="xs" c="dimmed" ml={8}>
                  {total > 0 ? Math.round((cents / total) * 100) : 0} %
                </Text>
              </Text>
            </Group>
            <Progress value={max > 0 ? (cents / max) * 100 : 0} color="gold" size="sm" />
          </div>
        ))}
      </Stack>
    </Paper>
  );
}

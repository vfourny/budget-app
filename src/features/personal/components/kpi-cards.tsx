import { Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

import { ENVELOPE_LABELS } from "@/lib/envelopes";
import { TRANSACTION_CATEGORIES } from "@/lib/categories";
import { formatCents } from "@/lib/format";
import type { Envelope } from "@server/generated/prisma/enums";

interface Overview {
  revenueCents: number;
  expenseCents: number;
  savingsCents: number;
  monthsWithData: number;
  byCategory: { category: keyof typeof TRANSACTION_CATEGORIES | null; expenseCents: number }[];
}

/** Dépenses regroupées par enveloppe (via la table des catégories), enveloppes vides omises. */
function expensesByEnvelope(overview: Overview): { envelope: Envelope; cents: number }[] {
  const totals = new Map<Envelope, number>();
  for (const { category, expenseCents } of overview.byCategory) {
    const envelope = category ? TRANSACTION_CATEGORIES[category].envelope : "DEPENSES_COURANTES";
    totals.set(envelope, (totals.get(envelope) ?? 0) + expenseCents);
  }
  return [...totals.entries()].map(([envelope, cents]) => ({ envelope, cents }));
}

export function KpiCards({ view, overview }: { view: "month" | "year"; overview: Overview }) {
  const envelopes = expensesByEnvelope(overview);
  const months = Math.max(1, overview.monthsWithData);
  const savingsRate =
    overview.revenueCents > 0
      ? Math.round((overview.savingsCents / overview.revenueCents) * 100)
      : 0;

  return (
    <SimpleGrid cols={{ base: 1, md: view === "month" ? 3 : 4 }} spacing={16} mb={16}>
      <Kpi
        label={view === "month" ? "Dépenses" : "Dépensé sur la période"}
        value={formatCents(overview.expenseCents)}
        hint="Hors épargne"
      >
        {envelopes.map(({ envelope, cents }) => (
          <Line key={envelope} name={ENVELOPE_LABELS[envelope]} value={formatCents(cents)} />
        ))}
      </Kpi>
      <Kpi
        label="Revenus"
        value={formatCents(overview.revenueCents)}
        color="blue.3"
        hint="Tous les crédits"
      />
      <Kpi
        label={view === "month" ? "Épargne du mois" : "Épargné"}
        value={formatCents(overview.savingsCents)}
        color="gold.6"
        hint={`${savingsRate} % des revenus`}
      />
      {view === "year" && (
        <Kpi
          label="Dépense moyenne / mois"
          value={formatCents(Math.round(overview.expenseCents / months))}
          hint={`${overview.monthsWithData} mois avec données`}
        />
      )}
    </SimpleGrid>
  );
}

function Kpi({
  label,
  value,
  hint,
  color,
  children,
}: {
  label: string;
  value: string;
  hint: string;
  color?: string;
  children?: ReactNode;
}) {
  return (
    <Paper withBorder radius="lg" p={24}>
      <Stack gap={6}>
        <Text size="sm" c="dimmed">
          {label}
        </Text>
        <Text fz={30} fw={600} lh={1.1} c={color}>
          {value}
        </Text>
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
        {children && (
          <Stack gap={8} mt={12}>
            {children}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

function Line({ name, value }: { name: string; value: string }) {
  return (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">
        {name}
      </Text>
      <Text size="sm" fw={600}>
        {value}
      </Text>
    </Group>
  );
}

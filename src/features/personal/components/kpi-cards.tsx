import { Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

import { EnvelopeGauge } from "@/features/personal/components/envelope-gauge";
import { useEnvelopeShares } from "@/features/settings/hooks/use-envelope-shares";
import { TRANSACTION_CATEGORIES } from "@/lib/categories";
import { ENVELOPE_LABELS } from "@/lib/envelopes";
import { formatCents } from "@/lib/format";
import type { Envelope } from "@server/generated/prisma/enums";
import type { BudgetEnvelope } from "@server/lib/settings/envelope-shares";

interface Overview {
  revenueCents: number;
  expenseCents: number;
  savingsCents: number;
  monthsWithData: number;
  byCategory: { category: keyof typeof TRANSACTION_CATEGORIES | null; expenseCents: number }[];
}

const EXPENSE_ENVELOPES = [
  "DEPENSES_COURANTES",
  "LOISIRS",
  "FORMATION",
] as const satisfies readonly BudgetEnvelope[];
const SAVINGS_ENVELOPES = [
  "EPARGNE_SECURITE",
  "EPARGNE_LONG_TERME",
] as const satisfies readonly BudgetEnvelope[];

/** Enveloppes qui ont au moins une catégorie : les autres n'ont rien à mesurer pour l'instant. */
const MAPPED_ENVELOPES = new Set<Envelope>(
  Object.values(TRANSACTION_CATEGORIES).map((category) => category.envelope),
);

/** Montant réel par enveloppe : dépenses via la table des catégories, épargne long terme à part. */
function realByEnvelope(overview: Overview): Map<Envelope, number> {
  const totals = new Map<Envelope, number>();
  for (const { category, expenseCents } of overview.byCategory) {
    const envelope = category ? TRANSACTION_CATEGORIES[category].envelope : "DEPENSES_COURANTES";
    totals.set(envelope, (totals.get(envelope) ?? 0) + expenseCents);
  }
  totals.set("EPARGNE_LONG_TERME", overview.savingsCents);
  return totals;
}

export function KpiCards({ view, overview }: { view: "month" | "year"; overview: Overview }) {
  // Sans les parts (chargement / erreur), les cartes restent utiles : on affiche le réel seul.
  const shares = useEnvelopeShares().data;
  const real = realByEnvelope(overview);
  const months = Math.max(1, overview.monthsWithData);
  const savingsRate =
    overview.revenueCents > 0
      ? Math.round((overview.savingsCents / overview.revenueCents) * 100)
      : 0;

  function gauges(envelopes: readonly BudgetEnvelope[], kind: "expense" | "savings") {
    return envelopes
      .filter((envelope) => MAPPED_ENVELOPES.has(envelope) || (real.get(envelope) ?? 0) > 0)
      .map((envelope) => {
        const realCents = real.get(envelope) ?? 0;
        if (!shares) {
          return (
            <Line key={envelope} name={ENVELOPE_LABELS[envelope]} value={formatCents(realCents)} />
          );
        }
        return (
          <EnvelopeGauge
            key={envelope}
            name={ENVELOPE_LABELS[envelope]}
            realCents={realCents}
            recommendedCents={Math.round((overview.revenueCents * shares[envelope]) / 100)}
            kind={kind}
          />
        );
      });
  }

  return (
    <SimpleGrid cols={{ base: 1, md: view === "month" ? 3 : 4 }} spacing={16} mb={16}>
      <Kpi
        label={view === "month" ? "Dépenses" : "Dépensé sur la période"}
        value={formatCents(overview.expenseCents)}
        hint="Hors épargne"
      >
        {gauges(EXPENSE_ENVELOPES, "expense")}
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
      >
        {gauges(SAVINGS_ENVELOPES, "savings")}
      </Kpi>
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

import { Anchor, Grid, Group, Paper, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { EnvelopeGauge } from "@/features/personal/components/envelope-gauge";
import { useIncomeTaxBrackets } from "@/features/settings/hooks/use-income-tax-brackets";
import { useEnvelopeShares } from "@/features/settings/hooks/use-envelope-shares";
import { SAVINGS_ENVELOPES, isSavingsEnvelope } from "@/lib/budget-rules";
import { ENVELOPE_ORDER, envelopeSourceText } from "@/lib/envelopes";
import { formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { estimateIncomeTaxCents } from "@/lib/income-tax";
import type { Envelope } from "@server/generated/prisma/enums";
import type { PeriodTotals } from "@server/lib/dashboard/aggregate";

type Overview = PeriodTotals & { monthsWithData: number };

/** Enveloppes de dépense = toutes sauf l'épargne (voir `SAVINGS_ENVELOPES` dans budget-rules). */
const EXPENSE_ENVELOPES = ENVELOPE_ORDER.filter((envelope) => !isSavingsEnvelope(envelope));

export function KpiCards({
  view,
  year,
  overview,
}: {
  view: "month" | "year";
  year: number;
  overview: Overview;
}) {
  // Sans les parts (chargement / erreur), les cartes restent utiles : on affiche le réel seul.
  const shares = useEnvelopeShares().data;
  const months = Math.max(1, overview.monthsWithData);
  const savingsRate =
    overview.revenueCents > 0
      ? Math.round((overview.savingsCents / overview.revenueCents) * 100)
      : 0;

  function gauges(envelopes: readonly Envelope[], kind: "expense" | "savings") {
    // Toutes les enveloppes sont affichées, même à 0 € : on veut voir la jauge et le conseillé.
    return envelopes.map((envelope) => {
      const realCents = overview.byEnvelope[envelope];
      if (!shares) {
        return <Line key={envelope} name={fr.envelopes[envelope]} value={formatCents(realCents)} />;
      }
      return (
        <EnvelopeGauge
          key={envelope}
          name={fr.envelopes[envelope]}
          realCents={realCents}
          recommendedCents={Math.round((overview.revenueCents * shares[envelope]) / 100)}
          recommendedPercent={shares[envelope]}
          sourceText={envelopeSourceText(envelope)}
          kind={kind}
        />
      );
    });
  }

  // Vue année : 5 cartes sur 2 lignes (3 + 2). Vue mois : 3 cartes sur 1 ligne.
  const topSpan = { base: 12, md: 4 };
  const bottomSpan = { base: 12, md: 6 };
  // IR estimé sur le revenu annualisé (cumul / mois avec données × 12), valeur dérivée au rendu.
  const brackets = useIncomeTaxBrackets(year);
  const annualRevenueCents = Math.round((overview.revenueCents / months) * 12);

  return (
    <Grid gap={16} mb={16} align="stretch">
      <Grid.Col span={topSpan}>
        <Kpi
          label={fr.common.revenues}
          value={formatCents(overview.revenueCents)}
          color="blue.3"
          hint={fr.personal.kpi.revenuesHint}
        >
          {overview.revenueLines.map((line) => (
            <Line key={line.key} name={fr.revenueLines[line.key]} value={formatCents(line.cents)} />
          ))}
        </Kpi>
      </Grid.Col>
      <Grid.Col span={topSpan}>
        <Kpi
          label={view === "month" ? fr.personal.kpi.expensesMonth : fr.personal.kpi.expensesYear}
          value={formatCents(overview.expenseCents)}
          hint={fr.personal.kpi.expensesHint}
        >
          {gauges(EXPENSE_ENVELOPES, "expense")}
        </Kpi>
      </Grid.Col>
      <Grid.Col span={topSpan}>
        <Kpi
          label={view === "month" ? fr.personal.kpi.savingsMonth : fr.personal.kpi.savingsYear}
          value={formatCents(overview.savingsCents)}
          color="gold.6"
          hint={fr.personal.kpi.savingsHint(savingsRate)}
        >
          {gauges(SAVINGS_ENVELOPES, "savings")}
        </Kpi>
      </Grid.Col>
      {view === "year" && (
        <>
          <Grid.Col span={bottomSpan}>
            <Kpi
              label={fr.personal.kpi.averageExpense}
              value={formatCents(Math.round(overview.expenseCents / months))}
              hint={fr.personal.kpi.monthsWithData(overview.monthsWithData)}
            />
          </Grid.Col>
          <Grid.Col span={bottomSpan}>
            {brackets.data && brackets.data.length > 0 ? (
              <Kpi
                label={fr.personal.kpi.incomeTax(year)}
                value={formatCents(estimateIncomeTaxCents(annualRevenueCents, brackets.data))}
                color="blue.3"
                hint={fr.personal.kpi.incomeTaxHint}
              />
            ) : (
              <Kpi
                label={fr.personal.kpi.incomeTax(year)}
                value={brackets.isPending ? "…" : "—"}
                color="blue.3"
                hint={
                  brackets.isError
                    ? fr.personal.kpi.incomeTaxLoadFailed
                    : brackets.isSuccess
                      ? fr.personal.kpi.incomeTaxMissing(year)
                      : ""
                }
              >
                {brackets.isSuccess && (
                  <Anchor component={Link} to="/settings" size="sm" c="amber.4">
                    {fr.personal.kpi.incomeTaxMissingLink}
                  </Anchor>
                )}
              </Kpi>
            )}
          </Grid.Col>
        </>
      )}
    </Grid>
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
    <Paper withBorder radius="lg" p={24} h="100%">
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

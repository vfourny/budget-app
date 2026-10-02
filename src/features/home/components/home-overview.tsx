import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Link } from "react-router";

import { useImports } from "@/features/imports/hooks/use-imports";
import { useOverview, usePeriods } from "@/features/personal/hooks/use-personal";
import { formatCents, formatDate, monthName } from "@/lib/format";

export function HomeOverview() {
  return (
    <Stack gap={16}>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={16}>
        <PersonalSummary />
        <ProSummary />
      </SimpleGrid>
      <ToCheck />
    </Stack>
  );
}

function SectionTitle({ title, suffix, to }: { title: string; suffix?: string; to?: string }) {
  return (
    <Group justify="space-between" align="baseline">
      <Title order={2}>
        {title}
        {suffix && (
          <Text span size="sm" c="dimmed" fw={500} ff="Manrope Variable, sans-serif" ml={8}>
            · {suffix}
          </Text>
        )}
      </Title>
      {to && (
        <Text
          component={Link}
          to={to}
          size="sm"
          fw={600}
          c="gold.6"
          style={{ textDecoration: "none" }}
        >
          Voir le détail →
        </Text>
      )}
    </Group>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fz={24} fw={600} c={color}>
        {value}
      </Text>
    </Stack>
  );
}

/** Résumé du dernier mois validé. */
function PersonalSummary() {
  const periods = usePeriods();
  const latest = periods.data?.[0];

  return (
    <Paper withBorder radius="lg" p={28}>
      <Stack gap={18}>
        <SectionTitle
          title="Perso"
          suffix={latest ? `${monthName(latest.month)} ${latest.year}` : undefined}
          to="/perso"
        />
        {periods.isPending ? (
          <Loader color="gold" size="sm" />
        ) : periods.isError ? (
          <Text c="red.4">Chargement impossible.</Text>
        ) : latest ? (
          <LatestMonthMetrics year={latest.year} month={latest.month} />
        ) : (
          <Text c="dimmed">Aucun import validé pour le moment.</Text>
        )}
      </Stack>
    </Paper>
  );
}

function LatestMonthMetrics({ year, month }: { year: number; month: number }) {
  const overview = useOverview(year, month);

  if (overview.isPending) return <Loader color="gold" size="sm" />;
  if (overview.isError) return <Text c="red.4">Chargement impossible.</Text>;

  return (
    <SimpleGrid cols={3}>
      <Metric label="Dépenses" value={formatCents(overview.data.expenseCents)} />
      <Metric label="Revenus" value={formatCents(overview.data.revenueCents)} color="blue.3" />
      <Metric label="Épargne" value={formatCents(overview.data.savingsCents)} color="gold.6" />
    </SimpleGrid>
  );
}

/** La partie pro n'existe pas encore (hors scope V1). */
function ProSummary() {
  return (
    <Paper withBorder radius="lg" p={28}>
      <Stack gap={18}>
        <SectionTitle title="Stygma SAS" />
        <Text c="dimmed">Le suivi pro (CA, résultat, TVA) arrivera après le MVP perso.</Text>
      </Stack>
    </Paper>
  );
}

/** Imports en attente : lignes à catégoriser ou import prêt à valider. */
function ToCheck() {
  const imports = useImports();
  const pending = imports.data?.filter((item) => item.status === "PENDING_REVIEW") ?? [];

  return (
    <Paper withBorder radius="lg" p={28}>
      <Stack gap={16}>
        <Group justify="space-between">
          <Title order={2}>À vérifier</Title>
          {pending.length > 0 && (
            <Badge color="amber" variant="light" size="lg">
              {pending.length}
            </Badge>
          )}
        </Group>

        {imports.isPending && <Loader color="gold" size="sm" />}
        {imports.isError && <Alert color="red" title="Impossible de charger les imports." />}
        {imports.isSuccess && pending.length === 0 && (
          <Text c="dimmed">Rien à vérifier : tous tes imports sont validés.</Text>
        )}

        {pending.map((item) => (
          <Paper key={item.id} radius="md" p={16} withBorder>
            <Group wrap="nowrap" gap={16}>
              <IconAlertTriangle size={20} color="var(--mantine-color-amber-4)" />
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <Text fw={600}>
                  {item.toReviewCount > 0
                    ? `${item.toReviewCount} transaction${item.toReviewCount > 1 ? "s" : ""} à vérifier`
                    : "Import prêt à valider"}
                </Text>
                <Text size="sm" c="dimmed" truncate>
                  Import du {formatDate(item.createdAt)} · {item.fileName}
                </Text>
              </div>
              <Button component={Link} to={`/imports/${item.id}`} variant="default">
                Relire
              </Button>
            </Group>
          </Paper>
        ))}
      </Stack>
    </Paper>
  );
}

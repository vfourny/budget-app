import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Group,
  Loader,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useReducer } from "react";
import { Link } from "react-router";

import {
  useBillingLines,
  useCopyBillingToFollowingMonths,
  useSetBillingLines,
  type BillingSource,
} from "@/features/professional/hooks/use-forecast-editor";
import { useClients } from "@/features/settings/hooks/use-clients";
import { errorMessage } from "@/lib/errors";
import { formatCents, formatHalfDays } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { Period } from "@/hooks/use-period-selection";

/** Ligne en cours d'édition : TJM en euros, jours décimaux (pas de 0,5) pour la saisie. */
interface Line {
  clientId: string;
  dailyRateEuros: number;
  days: number;
}

type Client = { id: string; defaultDailyRateCents: number | null };

/**
 * Brouillon des lignes, géré par un reducer : toutes les modifications passent par `dispatch`
 * (≈ des mutations nommées d'un store Pinia local au composant).
 */
type Action =
  | { type: "add"; client: Client }
  | { type: "update"; index: number; patch: Partial<Line> }
  | { type: "remove"; index: number };

function linesReducer(lines: Line[], action: Action): Line[] {
  switch (action.type) {
    case "add":
      return [
        ...lines,
        {
          clientId: action.client.id,
          dailyRateEuros: (action.client.defaultDailyRateCents ?? 0) / 100,
          days: 0,
        },
      ];
    case "update":
      return lines.map((line, index) =>
        index === action.index ? { ...line, ...action.patch } : line,
      );
    case "remove":
      return lines.filter((_, index) => index !== action.index);
  }
}

const halfDaysOf = (line: Line) => Math.round(line.days * 2);
const amountOf = (line: Line) =>
  Math.round((halfDaysOf(line) * Math.round(line.dailyRateEuros * 100)) / 2);

interface BillingTabProps {
  period: Period;
  source: BillingSource;
}

/** Onglet « Facturation » : jours × TJM par client, prévus ou réels. */
export function BillingTab({ period, source }: BillingTabProps) {
  const lines = useBillingLines(period.year, period.month, source);
  const clients = useClients();
  const text = fr.professional.editor;

  if (lines.isPending || clients.isPending) return <Loader color="gold" />;
  if (lines.isError || clients.isError) return <Alert color="red" title={text.loadFailed} />;
  if (clients.data.length === 0) {
    return (
      <Stack gap={8}>
        <Text c="dimmed">{text.billing.noClients}</Text>
        <Anchor component={Link} to="/settings?tab=professional">
          {text.billing.noClientsLink}
        </Anchor>
      </Stack>
    );
  }

  return (
    <BillingLinesForm
      // Remonté quand on change de source ou de mois : le brouillon repart des données serveur.
      key={`${period.year}-${period.month}-${source}`}
      period={period}
      source={source}
      clients={clients.data}
      initial={lines.data.map((line) => ({
        clientId: line.clientId,
        dailyRateEuros: line.dailyRateCents / 100,
        days: line.halfDays / 2,
      }))}
    />
  );
}

interface BillingLinesFormProps extends BillingTabProps {
  clients: readonly (Client & { name: string })[];
  initial: Line[];
}

function BillingLinesForm({ period, source, clients, initial }: BillingLinesFormProps) {
  const [lines, dispatch] = useReducer(linesReducer, initial);
  const save = useSetBillingLines();
  const copy = useCopyBillingToFollowingMonths();
  const text = fr.professional.editor;

  const totalCents = lines.reduce((total, line) => total + amountOf(line), 0);
  const totalHalfDays = lines.reduce((total, line) => total + halfDaysOf(line), 0);
  const changed = JSON.stringify(lines) !== JSON.stringify(initial);
  const options = clients.map((client) => ({ value: client.id, label: client.name }));
  const totalText = source === "FORECAST" ? text.billing.totalForecast : text.billing.totalActual;

  function saveLines(onSuccess?: () => void) {
    save.mutate(
      {
        year: period.year,
        month: period.month,
        kind: source,
        lines: lines.map((line) => ({
          clientId: line.clientId,
          dailyRateCents: Math.round(line.dailyRateEuros * 100),
          halfDays: halfDaysOf(line),
        })),
      },
      { onSuccess },
    );
  }

  return (
    <Stack gap={16}>
      <Text size="sm" c="dimmed">
        {source === "FORECAST" ? text.billing.hintForecast : text.billing.hintActual}
      </Text>
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{text.billing.client}</Table.Th>
            <Table.Th>{text.billing.dailyRate}</Table.Th>
            <Table.Th>{text.billing.days}</Table.Th>
            <Table.Th ta="right">{text.billing.total}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {lines.map((line, index) => (
            // Lignes sans identifiant stable : l'index suffit, l'ordre ne change que par suppression.
            <Table.Tr key={index}>
              <Table.Td>
                <Select
                  aria-label={text.billing.client}
                  data={options}
                  value={line.clientId}
                  allowDeselect={false}
                  onChange={(value) =>
                    value && dispatch({ type: "update", index, patch: { clientId: value } })
                  }
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  aria-label={text.billing.dailyRate}
                  min={0}
                  step={10}
                  decimalScale={2}
                  decimalSeparator=","
                  value={line.dailyRateEuros}
                  onChange={(value) =>
                    dispatch({
                      type: "update",
                      index,
                      patch: { dailyRateEuros: typeof value === "number" ? value : 0 },
                    })
                  }
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  aria-label={text.billing.days}
                  min={0}
                  max={31}
                  step={0.5}
                  decimalScale={1}
                  decimalSeparator=","
                  value={line.days}
                  onChange={(value) =>
                    dispatch({
                      type: "update",
                      index,
                      patch: { days: typeof value === "number" ? value : 0 },
                    })
                  }
                />
              </Table.Td>
              <Table.Td ta="right" fw={600}>
                {formatCents(amountOf(line))}
              </Table.Td>
              <Table.Td>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={text.billing.remove}
                  onClick={() => dispatch({ type: "remove", index })}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Group justify="space-between">
        <Button variant="subtle" onClick={() => dispatch({ type: "add", client: clients[0] })}>
          {text.billing.add}
        </Button>
        <Text size="sm" c="dimmed">
          {totalText(formatCents(totalCents), formatHalfDays(totalHalfDays))}
        </Text>
      </Group>

      {(save.isError || copy.isError) && (
        <Alert color="red" title={text.saveFailed}>
          {errorMessage(save.error ?? copy.error)}
        </Alert>
      )}
      {copy.isSuccess && !changed && (
        <Text size="sm" c="teal.4">
          {text.appliedNext}
        </Text>
      )}
      {save.isSuccess && !changed && !copy.isSuccess && (
        <Text size="sm" c="teal.4">
          {text.saved}
        </Text>
      )}

      <Group justify="flex-end">
        {source === "FORECAST" && period.month < 12 && (
          <Button
            variant="default"
            loading={copy.isPending}
            // Enregistre d'abord le mois affiché, puis le recopie sur la fin de l'année.
            onClick={() => saveLines(() => copy.mutate({ year: period.year, month: period.month }))}
          >
            {text.applyNext}
          </Button>
        )}
        <Button disabled={!changed} loading={save.isPending} onClick={() => saveLines()}>
          {fr.common.save}
        </Button>
      </Group>
    </Stack>
  );
}

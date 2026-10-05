import {
  ActionIcon,
  Alert,
  Autocomplete,
  Button,
  Group,
  Loader,
  NumberInput,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useReducer } from "react";

import {
  useBillingClients,
  useBillingLines,
  useCopyBillingToFollowingMonths,
  useSetBillingLines,
} from "@/features/professional/hooks/use-forecast-editor";
import { errorMessage } from "@/lib/errors";
import { formatCents, formatDays } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { Period } from "@/hooks/use-period-selection";
import { billingAmount, DAY_STEP, MAX_BILLED_DAYS, roundToDayStep } from "@shared/billing-days";
import type { BillingKind } from "@server/generated/prisma/enums";

/** Ligne en cours d'édition : TJM en euros, jours décimaux (pas de 0,5) pour la saisie. */
interface Line {
  clientName: string;
  dailyRateEuros: number;
  days: number;
}

/** Client déjà saisi dans une facturation : nom + TJM de sa ligne la plus récente. */
type KnownClient = { name: string; lastDailyRateCents: number };

/**
 * Brouillon des lignes, géré par un reducer : toutes les modifications passent par `dispatch`
 * (≈ des mutations nommées d'un store Pinia local au composant).
 */
type Action =
  | { type: "add"; client: KnownClient | undefined }
  | { type: "update"; index: number; patch: Partial<Line> }
  | { type: "remove"; index: number };

function linesReducer(lines: Line[], action: Action): Line[] {
  switch (action.type) {
    case "add":
      return [
        ...lines,
        {
          clientName: action.client?.name ?? "",
          dailyRateEuros: (action.client?.lastDailyRateCents ?? 0) / 100,
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

/** Jours enregistrés : la saisie arrondie à la demi-journée. */
const daysOf = (line: Line) => roundToDayStep(line.days);
const amountOf = (line: Line) =>
  billingAmount({
    days: daysOf(line),
    dailyRateCents: Math.round(line.dailyRateEuros * 100),
  });

interface BillingTabProps {
  period: Period;
  source: BillingKind;
}

/** Onglet « Facturation » : jours × TJM par client, prévus ou réels. */
export function BillingTab({ period, source }: BillingTabProps) {
  const lines = useBillingLines(period.year, period.month, source);
  const clients = useBillingClients();
  const text = fr.professional.editor;

  if (lines.isPending || clients.isPending) return <Loader color="gold" />;
  if (lines.isError || clients.isError) return <Alert color="red" title={text.loadFailed} />;

  return (
    <BillingLinesForm
      // Remonté quand on change de source ou de mois : le brouillon repart des données serveur.
      key={`${period.year}-${period.month}-${source}`}
      period={period}
      source={source}
      clients={clients.data}
      initial={lines.data.map((line) => ({
        clientName: line.clientName,
        dailyRateEuros: line.dailyRateCents / 100,
        days: line.days,
      }))}
    />
  );
}

interface BillingLinesFormProps extends BillingTabProps {
  clients: readonly KnownClient[];
  initial: Line[];
}

function BillingLinesForm({ period, source, clients, initial }: BillingLinesFormProps) {
  const [lines, dispatch] = useReducer(linesReducer, initial);
  const save = useSetBillingLines();
  const copy = useCopyBillingToFollowingMonths();
  const text = fr.professional.editor;

  const totalCents = lines.reduce((total, line) => total + amountOf(line), 0);
  const totalDays = lines.reduce((total, line) => total + daysOf(line), 0);
  const changed = JSON.stringify(lines) !== JSON.stringify(initial);
  const missingName = lines.some((line) => line.clientName.trim() === "");
  const clientNames = clients.map((client) => client.name);
  const totalText = source === "FORECAST" ? text.billing.totalForecast : text.billing.totalActual;

  function saveLines(onSuccess?: () => void) {
    save.mutate(
      {
        year: period.year,
        month: period.month,
        kind: source,
        lines: lines.map((line) => ({
          clientName: line.clientName.trim(),
          dailyRateCents: Math.round(line.dailyRateEuros * 100),
          days: daysOf(line),
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
                {/* Texte libre avec suggestions des clients déjà saisis ; choisir une suggestion
                    reprend son dernier TJM. */}
                <Autocomplete
                  aria-label={text.billing.client}
                  placeholder={text.billing.clientPlaceholder}
                  data={clientNames}
                  value={line.clientName}
                  error={line.clientName.trim() === ""}
                  onChange={(value) =>
                    dispatch({ type: "update", index, patch: { clientName: value } })
                  }
                  onOptionSubmit={(value) => {
                    const known = clients.find((client) => client.name === value);
                    if (known) {
                      dispatch({
                        type: "update",
                        index,
                        patch: { dailyRateEuros: known.lastDailyRateCents / 100 },
                      });
                    }
                  }}
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
                  max={MAX_BILLED_DAYS}
                  step={DAY_STEP}
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
        {/* Nouvelle ligne pré-remplie avec le client de la dernière ligne (souvent le même). */}
        <Button
          variant="subtle"
          onClick={() =>
            dispatch({
              type: "add",
              client:
                clients.find((client) => client.name === lines.at(-1)?.clientName) ?? clients[0],
            })
          }
        >
          {text.billing.add}
        </Button>
        <Text size="sm" c="dimmed">
          {totalText(formatCents(totalCents), formatDays(totalDays))}
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
            disabled={missingName}
            loading={copy.isPending}
            // Enregistre d'abord le mois affiché, puis le recopie sur la fin de l'année.
            onClick={() => saveLines(() => copy.mutate({ year: period.year, month: period.month }))}
          >
            {text.applyNext}
          </Button>
        )}
        <Button
          disabled={!changed || missingName}
          loading={save.isPending}
          onClick={() => saveLines()}
        >
          {fr.common.save}
        </Button>
      </Group>
    </Stack>
  );
}

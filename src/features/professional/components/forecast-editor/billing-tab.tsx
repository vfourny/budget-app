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
} from '@mantine/core'
import type { BillingKind } from '@server/generated/prisma/enums'
import {
  billingAmount,
  DAY_STEP,
  MAX_BILLED_DAYS,
  roundToDayStep,
} from '@shared/professional/billing-days'
import { IconTrash } from '@tabler/icons-react'
import { useReducer } from 'react'

import {
  useBillingClients,
  useBillingLines,
  useCopyBillingToFollowingMonths,
  useSetBillingLines,
} from '@/features/professional/hooks/use-forecast-editor'
import type { Period } from '@/hooks/use-period-selection'
import { errorMessage } from '@/lib/errors'
import { formatCents, formatDays } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

/** Ligne en cours d'édition : TJM en euros, jours décimaux (pas de 0,5) pour la saisie. */
interface Line {
  clientName: string
  dailyRateEuros: number
  days: number
}

/** Client déjà saisi dans une facturation : nom + TJM de sa ligne la plus récente. */
interface KnownClient {
  lastDailyRateCents: number
  name: string
}

/**
 * Brouillon des lignes, géré par un reducer : toutes les modifications passent par `dispatch`
 * (≈ des mutations nommées d'un store Pinia local au composant).
 */
type Action =
  | { type: 'add'; client: KnownClient | undefined }
  | { type: 'update'; index: number; patch: Partial<Line> }
  | { type: 'remove'; index: number }

function linesReducer(lines: Line[], action: Action): Line[] {
  switch (action.type) {
    case 'add':
      return [
        ...lines,
        {
          clientName: action.client?.name ?? '',
          dailyRateEuros: (action.client?.lastDailyRateCents ?? 0) / 100,
          days: 0,
        },
      ]
    case 'update':
      return lines.map((line, index) =>
        index === action.index ? { ...line, ...action.patch } : line,
      )
    case 'remove':
      return lines.filter((_, index) => index !== action.index)
  }
}

/** Jours enregistrés : la saisie arrondie à la demi-journée. */
const daysOf = (line: Line) => roundToDayStep(line.days)
const amountOf = (line: Line) =>
  billingAmount({
    days: daysOf(line),
    dailyRateCents: Math.round(line.dailyRateEuros * 100),
  })

interface BillingTabProps {
  period: Period
  source: BillingKind
}

/** Onglet « Facturation » : jours × TJM par client, prévus ou réels. */
export function BillingTab({ period, source }: BillingTabProps) {
  const lines = useBillingLines(period.year, period.month, source)
  const clients = useBillingClients()
  const text = fr.professional.editor

  if (lines.isPending || clients.isPending) return <Loader color="gold" />
  if (lines.isError || clients.isError)
    return <Alert color="red" title={text.loadFailed} />

  return (
    <BillingLinesForm
      // Remonté quand on change de source ou de mois : le brouillon repart des données serveur.
      clients={clients.data}
      initial={lines.data.map((line) => ({
        clientName: line.clientName,
        dailyRateEuros: line.dailyRateCents / 100,
        days: line.days,
      }))}
      key={`${period.year}-${period.month}-${source}`}
      period={period}
      source={source}
    />
  )
}

interface BillingLinesFormProps extends BillingTabProps {
  clients: readonly KnownClient[]
  initial: Line[]
}

function BillingLinesForm({
  period,
  source,
  clients,
  initial,
}: BillingLinesFormProps) {
  const [lines, dispatch] = useReducer(linesReducer, initial)
  const save = useSetBillingLines()
  const copy = useCopyBillingToFollowingMonths()
  const text = fr.professional.editor

  const totalCents = lines.reduce((total, line) => total + amountOf(line), 0)
  const totalDays = lines.reduce((total, line) => total + daysOf(line), 0)
  const changed = JSON.stringify(lines) !== JSON.stringify(initial)
  const missingName = lines.some((line) => line.clientName.trim() === '')
  const clientNames = clients.map((client) => client.name)
  const totalText =
    source === 'FORECAST'
      ? text.billing.totalForecast
      : text.billing.totalActual

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
    )
  }

  return (
    <Stack gap={16}>
      <Text c="dimmed" size="sm">
        {source === 'FORECAST'
          ? text.billing.hintForecast
          : text.billing.hintActual}
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
                  data={clientNames}
                  error={line.clientName.trim() === ''}
                  onChange={(value) =>
                    dispatch({
                      type: 'update',
                      index,
                      patch: { clientName: value },
                    })
                  }
                  onOptionSubmit={(value) => {
                    const known = clients.find(
                      (client) => client.name === value,
                    )
                    if (known) {
                      dispatch({
                        type: 'update',
                        index,
                        patch: {
                          dailyRateEuros: known.lastDailyRateCents / 100,
                        },
                      })
                    }
                  }}
                  placeholder={text.billing.clientPlaceholder}
                  value={line.clientName}
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  aria-label={text.billing.dailyRate}
                  decimalScale={2}
                  decimalSeparator=","
                  min={0}
                  onChange={(value) =>
                    dispatch({
                      type: 'update',
                      index,
                      patch: {
                        dailyRateEuros: typeof value === 'number' ? value : 0,
                      },
                    })
                  }
                  step={10}
                  value={line.dailyRateEuros}
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  aria-label={text.billing.days}
                  decimalScale={1}
                  decimalSeparator=","
                  max={MAX_BILLED_DAYS}
                  min={0}
                  onChange={(value) =>
                    dispatch({
                      type: 'update',
                      index,
                      patch: { days: typeof value === 'number' ? value : 0 },
                    })
                  }
                  step={DAY_STEP}
                  value={line.days}
                />
              </Table.Td>
              <Table.Td fw={600} ta="right">
                {formatCents(amountOf(line))}
              </Table.Td>
              <Table.Td>
                <ActionIcon
                  aria-label={text.billing.remove}
                  color="gray"
                  onClick={() => dispatch({ type: 'remove', index })}
                  variant="subtle"
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
          onClick={() =>
            dispatch({
              type: 'add',
              client:
                clients.find(
                  (client) => client.name === lines.at(-1)?.clientName,
                ) ?? clients[0],
            })
          }
          variant="subtle"
        >
          {text.billing.add}
        </Button>
        <Text c="dimmed" size="sm">
          {totalText(formatCents(totalCents), formatDays(totalDays))}
        </Text>
      </Group>

      {(save.isError || copy.isError) && (
        <Alert color="red" title={text.saveFailed}>
          {errorMessage(save.error ?? copy.error)}
        </Alert>
      )}
      {copy.isSuccess && !changed && (
        <Text c="teal.4" size="sm">
          {text.appliedNext}
        </Text>
      )}
      {save.isSuccess && !changed && !copy.isSuccess && (
        <Text c="teal.4" size="sm">
          {text.saved}
        </Text>
      )}

      <Group justify="flex-end">
        {source === 'FORECAST' && period.month < 12 && (
          <Button
            disabled={missingName}
            loading={copy.isPending}
            // Enregistre d'abord le mois affiché, puis le recopie sur la fin de l'année.
            onClick={() =>
              saveLines(() =>
                copy.mutate({ year: period.year, month: period.month }),
              )
            }
            variant="default"
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
  )
}

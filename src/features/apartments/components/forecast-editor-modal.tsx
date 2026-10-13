import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  NumberInput,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core'
import type { ApartmentForecastLine } from '@server/generated/prisma/enums'
import { useState } from 'react'

import {
  useApartmentForecastInputs,
  useSetApartmentForecast,
} from '@/features/apartments/hooks/use-apartments-dashboard'
import { errorMessage } from '@/lib/errors'
import { formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'
import type { RouterOutputs } from '@/lib/trpc'

type ForecastInput = RouterOutputs['apartmentForecast']['inputs'][number]

/** Saisie par ligne : `null` = pas de saisie (valeur par défaut). En centimes. */
type Overrides = Partial<Record<ApartmentForecastLine, number | null>>

interface YearMonth {
  month: number
  year: number
}

interface ForecastEditorModalProps {
  apartment: { acquiredAt: Date; id: string; name: string }
  initial: YearMonth
  onClose: () => void
}

const text = fr.apartments.editor

/** `<input type="month">` : valeur « aaaa-mm ». */
const toMonthValue = ({ year, month }: YearMonth) =>
  `${year}-${String(month).padStart(2, '0')}`

/**
 * Modale « Éditer le prévisionnel » d'un appartement : un mois à la fois (sélecteur, mois à venir
 * compris), une saisie par ligne. Montée seulement quand elle est ouverte (le parent la rend sous
 * condition), donc l'état initial vient des props.
 */
export function ForecastEditorModal({
  apartment,
  initial,
  onClose,
}: ForecastEditorModalProps) {
  const [period, setPeriod] = useState(initial)
  const acquired = {
    year: apartment.acquiredAt.getUTCFullYear(),
    month: apartment.acquiredAt.getUTCMonth() + 1,
  }

  return (
    <Modal
      closeButtonProps={{ 'aria-label': text.close }}
      onClose={onClose}
      opened
      size="lg"
      title={text.title(apartment.name)}
    >
      <Stack gap={16}>
        <TextInput
          label={text.month}
          min={toMonthValue(acquired)}
          onChange={(event) => {
            const [year, month] = event.currentTarget.value
              .split('-')
              .map(Number)
            if (year && month) setPeriod({ year, month })
          }}
          type="month"
          value={toMonthValue(period)}
          w={200}
        />
        <Text c="dimmed" size="sm">
          {text.hint}
        </Text>
        {/* `key` : changer de mois remonte le formulaire, le brouillon repart des saisies du mois. */}
        <ForecastLines
          apartmentId={apartment.id}
          key={toMonthValue(period)}
          period={period}
        />
      </Stack>
    </Modal>
  )
}

function ForecastLines({
  apartmentId,
  period,
}: {
  apartmentId: string
  period: YearMonth
}) {
  const inputs = useApartmentForecastInputs(
    apartmentId,
    period.year,
    period.month,
  )

  if (inputs.isPending) return <Loader color="gold" />
  if (inputs.isError) return <Alert color="red" title={text.loadFailed} />
  if (inputs.data.length === 0) return <Alert title={text.notActive} />
  return (
    <ForecastLinesForm
      apartmentId={apartmentId}
      inputs={inputs.data}
      period={period}
    />
  )
}

function ForecastLinesForm({
  apartmentId,
  period,
  inputs,
}: {
  apartmentId: string
  inputs: readonly ForecastInput[]
  period: YearMonth
}) {
  const initial: Overrides = Object.fromEntries(
    inputs.map((input) => [input.line, input.overrideCents]),
  )
  const [overrides, setOverrides] = useState<Overrides>(initial)
  const save = useSetApartmentForecast()

  // Valeurs dérivées du brouillon (≈ `computed`), recalculées à chaque rendu.
  const changed = inputs.some(
    ({ line }) => (overrides[line] ?? null) !== (initial[line] ?? null),
  )
  const hasOverride = inputs.some(
    ({ line }) => (overrides[line] ?? null) !== null,
  )

  function setAmount(line: ApartmentForecastLine, cents: number | null) {
    setOverrides((current) => ({ ...current, [line]: cents }))
  }

  return (
    <Stack gap={16}>
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{text.line}</Table.Th>
            <Table.Th>{text.forecast}</Table.Th>
            <Table.Th ta="right">{text.default}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {inputs.map(({ line, defaultCents }) => {
            const label = fr.apartments.table.rows[line]
            const override = overrides[line] ?? null
            return (
              <Table.Tr key={line}>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <Text size="sm">{label}</Text>
                    {override !== null && (
                      <Badge color="gold" size="xs" tt="none" variant="light">
                        {text.modified}
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    aria-label={text.amountAria(label)}
                    decimalScale={2}
                    decimalSeparator=","
                    min={0}
                    onChange={(value) =>
                      setAmount(
                        line,
                        Math.round(
                          (typeof value === 'number' ? value : 0) * 100,
                        ),
                      )
                    }
                    suffix={` ${fr.common.euro}`}
                    thousandSeparator=" "
                    value={(override ?? defaultCents) / 100}
                    w={150}
                  />
                </Table.Td>
                <Table.Td c="dimmed" ta="right">
                  {formatCents(defaultCents)}
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>

      {save.isError && (
        <Alert color="red" title={text.saveFailed}>
          {errorMessage(save.error)}
        </Alert>
      )}
      {save.isSuccess && !changed && (
        <Text c="teal.4" size="sm">
          {text.saved}
        </Text>
      )}

      <Group justify="flex-end">
        <Button
          disabled={!hasOverride}
          onClick={() =>
            setOverrides(
              Object.fromEntries(inputs.map(({ line }) => [line, null])),
            )
          }
          variant="subtle"
        >
          {text.reset}
        </Button>
        <Button
          disabled={!changed}
          loading={save.isPending}
          onClick={() =>
            save.mutate({
              apartmentId,
              year: period.year,
              month: period.month,
              values: inputs.map(({ line }) => ({
                line,
                amountCents: overrides[line] ?? null,
              })),
            })
          }
        >
          {fr.common.save}
        </Button>
      </Group>
    </Stack>
  )
}

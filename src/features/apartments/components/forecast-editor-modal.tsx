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
  Title,
} from '@mantine/core'
import type { ApartmentForecastLine } from '@server/generated/prisma/enums'
import { type YearMonth, yearMonthOf } from '@shared/common/year-month.util'
import { useState } from 'react'

import { EuroField } from '@/components/euro-field'
import { PercentField } from '@/components/percent-field'
import {
  useApartmentForecastInputs,
  useSetApartmentForecast,
} from '@/features/apartments/hooks/use-apartments-dashboard'
import { errorMessage } from '@/lib/errors'
import { formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'
import type { RouterOutputs } from '@/lib/trpc'

type ForecastInputs = RouterOutputs['apartmentForecast']['inputs']
type ForecastInput = ForecastInputs['lines'][number]
type Management = NonNullable<ForecastInputs['management']>
type Invoice = NonNullable<Management['invoice']>

/** Saisie par ligne : `null` = pas de saisie (valeur par défaut). En centimes. */
type Overrides = Partial<Record<ApartmentForecastLine, number | null>>

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
 * compris), une saisie par ligne ; pour un bien géré, le taux de gérance prévu et la facture du mois
 * (réel, mois clos). Montée seulement quand elle est ouverte (le parent la rend sous
 * condition), donc l'état initial vient des props.
 */
export function ForecastEditorModal({
  apartment,
  initial,
  onClose,
}: ForecastEditorModalProps) {
  const [period, setPeriod] = useState(initial)
  const acquired = yearMonthOf(apartment.acquiredAt)

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
  if (inputs.data.lines.length === 0) return <Alert title={text.notActive} />
  return (
    <ForecastLinesForm
      apartmentId={apartmentId}
      inputs={inputs.data.lines}
      management={inputs.data.management}
      period={period}
    />
  )
}

function ForecastLinesForm({
  apartmentId,
  period,
  inputs,
  management,
}: {
  apartmentId: string
  inputs: readonly ForecastInput[]
  /** `null` = bien en direct : pas de section Gérance. */
  management: Management | null
  period: YearMonth
}) {
  const initial: Overrides = Object.fromEntries(
    inputs.map((input) => [input.line, input.overrideCents]),
  )
  const [overrides, setOverrides] = useState<Overrides>(initial)
  const [feeBps, setFeeBps] = useState(management?.feeBps ?? 0)
  // `null` = facture non saisie : rien n'est enregistré tant qu'on ne touche pas aux champs.
  const [invoice, setInvoice] = useState<Invoice | null>(
    management?.invoice ?? null,
  )
  const save = useSetApartmentForecast()

  // Valeurs dérivées du brouillon (≈ `computed`), recalculées à chaque rendu.
  const feeChanged = management !== null && feeBps !== management.feeBps
  const savedInvoice = management?.invoice ?? null
  const invoiceChanged =
    invoice !== null &&
    (savedInvoice === null ||
      invoice.feesCents !== savedInvoice.feesCents ||
      invoice.extraFeesCents !== savedInvoice.extraFeesCents)
  const changed =
    feeChanged ||
    invoiceChanged ||
    inputs.some(
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

      {management && (
        <Stack gap={12}>
          <Title order={4}>{text.management.title}</Title>
          <PercentField
            bps={feeBps}
            description={text.management.feeRateHint}
            label={text.management.feeRate}
            onChange={setFeeBps}
          />
          <Group gap={8}>
            <Text fw={500} size="sm">
              {text.management.invoiceTitle}
            </Text>
            {management.closed && management.invoice === null && (
              <Badge color="amber" size="xs" tt="none" variant="light">
                {text.management.missing}
              </Badge>
            )}
          </Group>
          {management.closed ? (
            <>
              <Text c="dimmed" size="sm">
                {text.management.invoiceHint}
              </Text>
              <Group align="flex-end" gap={16} grow>
                <EuroField
                  cents={invoice?.feesCents ?? 0}
                  label={text.management.fees}
                  onChange={(feesCents) =>
                    setInvoice((current) => ({
                      extraFeesCents: current?.extraFeesCents ?? 0,
                      feesCents,
                    }))
                  }
                />
                <EuroField
                  cents={invoice?.extraFeesCents ?? 0}
                  label={text.management.extraFees}
                  onChange={(extraFeesCents) =>
                    setInvoice((current) => ({
                      feesCents: current?.feesCents ?? 0,
                      extraFeesCents,
                    }))
                  }
                />
              </Group>
            </>
          ) : (
            <Text c="dimmed" size="sm">
              {text.management.invoiceNotClosed}
            </Text>
          )}
        </Stack>
      )}

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
              managementFeeBps: feeChanged ? feeBps : undefined,
              invoice: invoiceChanged ? invoice : undefined,
            })
          }
        >
          {fr.common.save}
        </Button>
      </Group>
    </Stack>
  )
}

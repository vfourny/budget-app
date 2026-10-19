import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  NumberInput,
  Stack,
  Table,
  Text,
} from '@mantine/core'
import type { ProfessionalYearSettingsValues } from '@shared/professional/rules'
import { useState } from 'react'

import {
  useCopySalaryToFollowingMonths,
  useSalaryForecast,
  useSetSalary,
} from '@/features/professional/hooks/use-forecast-editor'
import type { Period } from '@/hooks/use-period-selection'
import { errorMessage } from '@/lib/errors'
import { capitalizedMonthName, formatBp, formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

/** Onglet « Salaire » : brut prévu du mois (défaut : brut du même mois N-1). */
export function SalaryTab({
  period,
  settings,
}: {
  period: Period
  settings: ProfessionalYearSettingsValues
}) {
  const salary = useSalaryForecast(period.year, period.month)
  if (salary.isPending) return <Loader color="gold" />
  if (salary.isError)
    return <Alert color="red" title={fr.professional.editor.loadFailed} />
  return (
    <SalaryFields
      employerBp={settings.employerContributionBp}
      initial={salary.data.overrideCents}
      key={`${period.year}-${period.month}`}
      lastYearCents={salary.data.lastYearCents}
      period={period}
    />
  )
}

interface SalaryFieldsProps {
  employerBp: number
  initial: number | null
  lastYearCents: number
  period: Period
}

function SalaryFields({
  period,
  employerBp,
  initial,
  lastYearCents,
}: SalaryFieldsProps) {
  // `null` = pas de saisie : la valeur affichée est alors celle de N-1.
  const [gross, setGross] = useState<number | null>(initial)
  const save = useSetSalary()
  const copy = useCopySalaryToFollowingMonths()
  const text = fr.professional.editor
  const shownCents = gross ?? lastYearCents
  const employerCents = Math.round((shownCents * employerBp) / 10_000)
  const changed = gross !== initial

  function saveSalary(onSuccess?: () => void) {
    save.mutate(
      { year: period.year, month: period.month, grossSalaryCents: gross },
      { onSuccess },
    )
  }

  return (
    <Stack gap={16}>
      <Text c="dimmed" size="sm">
        {text.salary.hint}
      </Text>
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{text.salary.month}</Table.Th>
            <Table.Th>{text.salary.gross}</Table.Th>
            <Table.Th ta="right">{text.salary.lastYear}</Table.Th>
            <Table.Th ta="right">
              {text.salary.employer(formatBp(employerBp))}
            </Table.Th>
            <Table.Th ta="right">{text.salary.cost}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td>
              <Group gap={6}>
                <Text size="sm">{`${capitalizedMonthName(period.month)} ${period.year}`}</Text>
                {gross !== null && (
                  <Badge color="gold" size="xs" tt="none" variant="light">
                    {text.amounts.modified}
                  </Badge>
                )}
              </Group>
            </Table.Td>
            <Table.Td>
              <NumberInput
                aria-label={text.salary.gross}
                decimalScale={2}
                decimalSeparator=","
                min={0}
                onChange={(value) =>
                  setGross(
                    Math.round((typeof value === 'number' ? value : 0) * 100),
                  )
                }
                step={10}
                value={shownCents / 100}
                w={140}
              />
            </Table.Td>
            <Table.Td c="dimmed" ta="right">
              {formatCents(lastYearCents)}
            </Table.Td>
            <Table.Td ta="right">{formatCents(employerCents)}</Table.Td>
            <Table.Td fw={600} ta="right">
              {formatCents(shownCents + employerCents)}
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>

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
        <Button
          disabled={gross === null}
          onClick={() => setGross(null)}
          variant="subtle"
        >
          {text.salary.resetLastYear}
        </Button>
        {period.month < 12 && (
          <Button
            loading={copy.isPending}
            onClick={() =>
              saveSalary(() =>
                copy.mutate({
                  year: period.year,
                  month: period.month,
                  grossSalaryCents: shownCents,
                }),
              )
            }
            variant="default"
          >
            {text.applyNext}
          </Button>
        )}
        <Button
          disabled={!changed}
          loading={save.isPending}
          onClick={() => saveSalary()}
        >
          {fr.common.save}
        </Button>
      </Group>
    </Stack>
  )
}

import { Group, Paper, Stack, Table, Text } from '@mantine/core'
import type {
  ForecastActual,
  ProfessionalMonth,
} from '@server/lib/professional/professional.type'

import { InfoTip } from '@/components/info-tip'
import { formatCents, monthName } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

import classes from './vat-card.module.css'

type LineKey = keyof typeof fr.professional.vat.signs

/** Ligne du tableau : signe, libellé (+ précision), réel et prévu. */
interface VatLine {
  amount: ForecastActual
  key: LineKey
  label: string
  sub?: string
}

/** Écart réel − prévu de la TVA à reverser, en une phrase (pas de réel : mention « prévisionnel »). */
function gapText(due: ForecastActual): string {
  const text = fr.professional.vat.gap
  if (due.actual === null) return text.forecastOnly
  const gap = due.actual - due.forecast
  if (gap === 0) return text.even
  const amount = formatCents(Math.abs(gap))
  return gap < 0 ? text.below(amount) : text.above(amount)
}

/**
 * Carte « TVA à reverser » : l'équation collectée − déductible = à reverser, posée comme une
 * soustraction, avec le réel et le prévu en colonnes.
 */
export function VatCard({ month }: { month: ProfessionalMonth }) {
  const { vat } = month
  const text = fr.professional.vat
  // La TVA d'un mois se déclare le mois suivant (décembre → janvier).
  const declareMonth = monthName((month.month % 12) + 1)

  const lines: VatLine[] = [
    {
      key: 'collected',
      label: text.collected,
      sub: text.collectedSub,
      amount: vat.collected,
    },
    {
      key: 'deductible',
      label: text.deductible,
      sub: text.deductibleSub,
      amount: vat.deductible,
    },
    { key: 'due', label: text.due, amount: vat.due },
  ]

  return (
    <Paper h="100%" p={24} radius="lg" withBorder>
      <Stack gap={20}>
        <div>
          <Group gap={4}>
            <Text c="dimmed" size="sm">
              {text.title}
            </Text>
            <InfoTip
              ariaLabel={fr.professional.howComputed(text.title)}
              label={text.tip}
            />
          </Group>
          <Group align="baseline" gap={10}>
            <Text
              c={vat.due.actual === null ? 'dimmed' : undefined}
              fw={600}
              fz={30}
              lh={1.1}
            >
              {formatCents(vat.due.actual ?? vat.due.forecast)}
            </Text>
            <Text c="dimmed" size="xs">
              {text.declareIn(declareMonth)}
            </Text>
          </Group>
        </div>

        <Table className={classes.table} horizontalSpacing={6}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th />
              <Table.Th />
              <Table.Th c="var(--app-caption)" fw={400} fz="xs" ta="right">
                {text.columns.actual}
              </Table.Th>
              <Table.Th c="var(--app-caption)" fw={400} fz="xs" ta="right">
                {text.columns.forecast}
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lines.map((line) => {
              const isTotal = line.key === 'due'
              return (
                <Table.Tr
                  className={isTotal ? classes.total : undefined}
                  key={line.key}
                >
                  <Table.Td className={classes.sign}>
                    {text.signs[line.key]}
                  </Table.Td>
                  <Table.Th fw={isTotal ? 700 : 400} scope="row">
                    {line.label}
                    {line.sub && (
                      <Text c="dimmed" ml={6} size="xs" span>
                        {line.sub}
                      </Text>
                    )}
                  </Table.Th>
                  <Table.Td
                    c={isTotal ? 'gold.6' : undefined}
                    className="nowrap"
                    fw={isTotal ? 700 : 600}
                    ta="right"
                  >
                    {line.amount.actual === null
                      ? '—'
                      : formatCents(line.amount.actual)}
                  </Table.Td>
                  <Table.Td c="dimmed" className="nowrap" fz="xs" ta="right">
                    {formatCents(line.amount.forecast)}
                  </Table.Td>
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>

        <Text c="dimmed" size="xs">
          {gapText(vat.due)}
        </Text>
      </Stack>
    </Paper>
  )
}

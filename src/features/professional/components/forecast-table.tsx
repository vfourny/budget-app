import { Table, Text } from '@mantine/core'
import type { ForecastActual } from '@server/lib/professional/professional.type'
import { Fragment } from 'react'

import type { GaugeGoal } from '@/components/target-gauge'
import { formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

/** `detail` : ligne « dont … » grisée ; `memo` : pour info (hors total) ; `total` : ligne de total. */
type ForecastRowTone = 'normal' | 'detail' | 'memo' | 'total'

export interface ForecastRow {
  amount: ForecastActual
  /** Sens favorable de l'écart : `atMost` pour une charge (moins = mieux). */
  goal: GaugeGoal
  key: string
  label: string
  sub?: string
  tone?: ForecastRowTone
}

export interface ForecastTableGroup {
  key: string
  label: string
  rows: ForecastRow[]
}

/** Tableau Catégorie / Prévu / Réel / Écart, par groupes (vue mois et vue année). */
export function ForecastTable({
  groups,
}: {
  groups: readonly ForecastTableGroup[]
}) {
  const columns = fr.professional.categories.columns
  return (
    <Table.ScrollContainer minWidth={560}>
      <Table horizontalSpacing="md" verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{columns.category}</Table.Th>
            <Table.Th ta="right">{columns.forecast}</Table.Th>
            <Table.Th ta="right">{columns.actual}</Table.Th>
            <Table.Th ta="right">{columns.delta}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {groups.map((group) => (
            <Fragment key={group.key}>
              <Table.Tr>
                <Table.Th
                  c="gold.6"
                  colSpan={4}
                  fz="xs"
                  pt={16}
                  scope="colgroup"
                  tt="uppercase"
                >
                  {group.label}
                </Table.Th>
              </Table.Tr>
              {group.rows.map((row) => (
                <Row key={row.key} row={row} />
              ))}
            </Fragment>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}

function Row({ row }: { row: ForecastRow }) {
  const { amount, tone = 'normal' } = row
  const delta = amount.actual === null ? null : amount.actual - amount.forecast
  const favorable =
    delta !== null && (row.goal === 'atMost' ? delta < 0 : delta > 0)
  const muted = tone === 'detail' || tone === 'memo'
  const bold = tone === 'total' ? 700 : undefined

  return (
    <Table.Tr>
      <Table.Th fw={bold ?? 400} scope="row">
        <Text c={muted ? 'dimmed' : undefined} fw={bold} size="sm" span>
          {row.label}
        </Text>
        {row.sub && (
          <Text c="dimmed" ml={6} size="xs" span>
            · {row.sub}
          </Text>
        )}
      </Table.Th>
      <Table.Td c="dimmed" className="nowrap" fw={bold} ta="right">
        {formatCents(amount.forecast)}
      </Table.Td>
      <Table.Td
        c={muted ? 'dimmed' : undefined}
        className="nowrap"
        fw={bold ?? 600}
        ta="right"
      >
        {amount.actual === null ? '—' : formatCents(amount.actual)}
      </Table.Td>
      <Table.Td
        c={
          delta === null || delta === 0
            ? 'dimmed'
            : favorable
              ? 'teal.4'
              : 'red.4'
        }
        className="nowrap"
        fw={bold}
        ta="right"
      >
        {delta === null
          ? '—'
          : `${delta > 0 ? '+ ' : delta < 0 ? '− ' : ''}${formatCents(Math.abs(delta))}`}
      </Table.Td>
    </Table.Tr>
  )
}

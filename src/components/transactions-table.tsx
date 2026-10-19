import {
  Badge,
  Card,
  Group,
  SegmentedControl,
  Table,
  Text,
  UnstyledButton,
} from '@mantine/core'
import type { TransactionCategory } from '@server/generated/prisma/enums'
import { isToCheck } from '@shared/transactions/categories.rules'
import { useState } from 'react'

import { formatCents, formatDate } from '@/lib/format'
import { fr, LOCALE } from '@/lib/i18n/fr'

import classes from './transactions-table.module.css'

export interface TransactionRow {
  /** Centimes, signé : négatif = débit. */
  amountCents: number
  /** Nom de l'appartement rattaché : la colonne « Appartement » n'apparaît que s'il est renseigné. */
  apartmentName?: string
  category: TransactionCategory | null
  date: Date
  id: string
  label: string
}

type SortKey = 'date' | 'label' | 'category' | 'amount'
type Filter = 'all' | 'credits' | 'debits' | 'toCheck'

const categoryLabel = (row: TransactionRow) =>
  row.category ? fr.categories[row.category] : ''

const COMPARATORS = {
  date: (a, b) => a.date.getTime() - b.date.getTime(),
  label: (a, b) => a.label.localeCompare(b.label, LOCALE),
  category: (a, b) => categoryLabel(a).localeCompare(categoryLabel(b), LOCALE),
  amount: (a, b) => a.amountCents - b.amountCents,
} as const satisfies Record<
  SortKey,
  (a: TransactionRow, b: TransactionRow) => number
>

const FILTERS = {
  all: () => true,
  credits: (row) => row.amountCents > 0,
  debits: (row) => row.amountCents < 0,
  toCheck: (row) => isToCheck(row.category),
} as const satisfies Record<Filter, (row: TransactionRow) => boolean>

const COLUMNS = [
  { key: 'date', label: fr.common.date },
  { key: 'label', label: fr.common.label },
  { key: 'category', label: fr.common.category },
  { key: 'amount', label: fr.common.amount },
] as const satisfies { key: SortKey; label: string }[]

/** 1er clic sur une colonne : dates et montants du plus grand au plus petit, textes de A à Z. */
const FIRST_DIRECTION = {
  date: 'desc',
  label: 'asc',
  category: 'asc',
  amount: 'desc',
} as const satisfies Record<SortKey, 'asc' | 'desc'>

interface TransactionsTableProps {
  /** Message quand il n'y a aucune transaction (défaut : « Aucune transaction pour ce mois. »). */
  emptyText?: string
  transactions: readonly TransactionRow[]
}

/**
 * Tableau « Transactions du mois », identique en Perso et en Pro : résumé (nombre, crédits,
 * débits), filtres avec compteurs, tri par colonne, badge « À vérifier » (`isToCheck`, `shared/transactions/categories.ts`).
 * `id="transactions"` : cible de l'ancre « Transactions (N) » de l'en-tête Pro.
 */
export function TransactionsTable({
  transactions,
  emptyText,
}: TransactionsTableProps) {
  // Tri et filtre locaux à l'écran (≈ deux `ref()` Vue) : rien à partager avec d'autres composants.
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'date',
    dir: 'desc',
  })
  const [filter, setFilter] = useState<Filter>('all')

  // Valeurs dérivées pendant le rendu (≈ `computed`).
  const counts = {
    all: transactions.length,
    credits: transactions.filter(FILTERS.credits).length,
    debits: transactions.filter(FILTERS.debits).length,
    toCheck: transactions.filter(FILTERS.toCheck).length,
  } satisfies Record<Filter, number>
  const showApartment = transactions.some(
    (row) => row.apartmentName !== undefined,
  )
  const creditsCents = transactions.reduce(
    (sum, row) => sum + Math.max(0, row.amountCents),
    0,
  )
  const debitsCents = transactions.reduce(
    (sum, row) => sum + Math.max(0, -row.amountCents),
    0,
  )
  const rows = transactions.filter(FILTERS[filter]).sort((a, b) => {
    const result = COMPARATORS[sort.key](a, b)
    return sort.dir === 'asc' ? result : -result
  })

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      dir:
        current.key === key
          ? current.dir === 'asc'
            ? 'desc'
            : 'asc'
          : FIRST_DIRECTION[key],
    }))
  }

  return (
    <Card className={classes.card} component="section" id="transactions">
      <Card.Section px={24} py={20} withBorder>
        <Group align="baseline" gap={8} justify="space-between">
          <Text fw={600}>{fr.transactions.title}</Text>
          {transactions.length > 0 && (
            <Text c="dimmed" size="sm">
              {fr.transactions.summary(
                transactions.length,
                formatCents(creditsCents),
                formatCents(debitsCents),
              )}
            </Text>
          )}
        </Group>
        {transactions.length > 0 && (
          <SegmentedControl
            aria-label={fr.transactions.filtersAria}
            data={(Object.keys(FILTERS) as Filter[]).map((key) => ({
              value: key,
              label: fr.transactions.filters[key](counts[key]),
            }))}
            mt={12}
            onChange={(value) => setFilter(value as Filter)}
            size="xs"
            value={filter}
          />
        )}
      </Card.Section>
      {rows.length === 0 ? (
        <Text c="dimmed" p={28}>
          {transactions.length === 0
            ? (emptyText ?? fr.transactions.empty)
            : fr.transactions.emptyFilter}
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={560}>
          <Table horizontalSpacing="lg" verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                {COLUMNS.map((column) => (
                  <Table.Th
                    key={column.key}
                    ta={column.key === 'amount' ? 'right' : undefined}
                  >
                    <UnstyledButton
                      fw={700}
                      fz="inherit"
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.label}
                      {sort.key === column.key &&
                        (sort.dir === 'asc' ? ' ↑' : ' ↓')}
                    </UnstyledButton>
                  </Table.Th>
                ))}
                {showApartment && (
                  <Table.Th>{fr.transactions.apartment}</Table.Th>
                )}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr key={row.id}>
                  <Table.Td c="dimmed" className="nowrap">
                    {formatDate(row.date)}
                  </Table.Td>
                  <Table.Td>{row.label}</Table.Td>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Badge
                        className={classes.badge}
                        color="gray"
                        variant="light"
                      >
                        {categoryLabel(row) || fr.common.noCategory}
                      </Badge>
                      {isToCheck(row.category) && (
                        <Badge
                          className={classes.badge}
                          color="amber"
                          variant="light"
                        >
                          {fr.transactions.toCheck}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td
                    c={row.amountCents > 0 ? 'teal.4' : undefined}
                    className="nowrap"
                    fw={600}
                    ta="right"
                  >
                    {row.amountCents > 0 ? '+ ' : '− '}
                    {formatCents(Math.abs(row.amountCents))}
                  </Table.Td>
                  {showApartment && <Table.Td>{row.apartmentName}</Table.Td>}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Card>
  )
}

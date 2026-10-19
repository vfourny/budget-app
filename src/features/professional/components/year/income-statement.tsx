import { Paper, Table, Text, Title } from '@mantine/core'
import type { ProfessionalMonth } from '@server/lib/professional/professional.type'

import { finalOf } from '@/features/professional/final-amount'
import { formatEurosRounded, shortMonthName } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

import classes from './income-statement.module.css'

type RowKey = keyof typeof fr.professional.year.statement.rows

/** Une ligne : valeur d'un mois (finale, sauf le prévu d'origine) et couleur éventuelle. */
const ROWS: {
  key: RowKey
  value: (month: ProfessionalMonth) => number
  color?: string
  strong?: boolean
}[] = [
  {
    key: 'forecastRevenue',
    value: (month) => month.revenue.forecast,
    color: 'dimmed',
  },
  {
    key: 'revenue',
    value: (month) => finalOf(month.revenue),
    color: 'gold.6',
    strong: true,
  },
  { key: 'charges', value: (month) => finalOf(month.charges.total) },
  {
    key: 'payroll',
    value: (month) =>
      finalOf(month.remuneration.grossSalary) +
      finalOf(month.remuneration.employerContributions),
  },
  {
    key: 'socialCharges',
    value: (month) => finalOf(month.profitSocialCharges),
    color: 'red.4',
  },
  {
    key: 'profit',
    value: (month) => finalOf(month.profit),
    color: 'gold.6',
    strong: true,
  },
  { key: 'bnc', value: (month) => finalOf(month.remuneration.bncWithdrawal) },
  { key: 'vat', value: (month) => finalOf(month.vat.due), color: 'blue.3' },
  { key: 'mileage', value: (month) => finalOf(month.mileage.amount) },
]

/** « Compte de résultat simplifié » : une colonne par mois + « Final » (somme réel + prévu restant). */
export function IncomeStatement({
  months,
}: {
  months: readonly ProfessionalMonth[]
}) {
  const text = fr.professional.year.statement
  return (
    <Paper
      aria-label={text.title}
      component="section"
      mb={16}
      p={24}
      radius="lg"
      withBorder
    >
      <Title order={2}>{text.title}</Title>
      <Text c="dimmed" mb={16} size="xs">
        {text.subtitle}
      </Text>
      <Table.ScrollContainer minWidth={1100}>
        <Table
          className={classes.table}
          horizontalSpacing="xs"
          verticalSpacing="xs"
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{text.line}</Table.Th>
              {months.map((month) => (
                <Table.Th key={month.month} ta="right">
                  {shortMonthName(month.month)}
                </Table.Th>
              ))}
              <Table.Th ta="right">{text.final}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {ROWS.map((row) => (
              <Table.Tr key={row.key}>
                <Table.Th c={row.color} fw={row.strong ? 700 : 500} scope="row">
                  {text.rows[row.key]}
                </Table.Th>
                {months.map((month) => (
                  <Table.Td
                    c={month.hasActual ? undefined : 'dimmed'}
                    fs={month.hasActual ? undefined : 'italic'}
                    fw={row.strong ? 600 : undefined}
                    key={month.month}
                    ta="right"
                  >
                    {formatEurosRounded(row.value(month))}
                  </Table.Td>
                ))}
                <Table.Td c={row.color} fw={700} ta="right">
                  {formatEurosRounded(
                    months.reduce(
                      (total, month) => total + row.value(month),
                      0,
                    ),
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  )
}

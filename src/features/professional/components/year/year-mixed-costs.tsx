import { Group, Paper, Stack, Text, Title } from '@mantine/core'
import type { ProfessionalMonth } from '@shared/professional/professional.type'

import { TargetGauge } from '@/components/target-gauge'
import { formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

/** « Frais mixtes · année » : par frais, prévu de l'année, payé en perso, dû, remboursé, reste. */
export function YearMixedCosts({
  months,
}: {
  months: readonly ProfessionalMonth[]
}) {
  const text = fr.professional.year.mixedCosts
  const actualMonths = months.filter((month) => month.hasActual)
  const categories = months[0]?.mixedCosts.rows.map((row) => row.category) ?? []

  const lines = categories.map((category, index) => {
    const sum = (
      list: readonly ProfessionalMonth[],
      pick: (row: ProfessionalMonth['mixedCosts']['rows'][number]) => number,
    ) =>
      list.reduce((total, month) => {
        const row = month.mixedCosts.rows[index]
        return row ? total + pick(row) : total
      }, 0)
    const due = sum(actualMonths, (row) => row.due.actual ?? 0)
    const paid = sum(actualMonths, (row) => row.paidCents ?? 0)
    return {
      category,
      yearForecast: sum(months, (row) => row.due.actual ?? row.due.forecast),
      spent: sum(actualMonths, (row) => row.spent.actual ?? 0),
      due,
      paid,
      left: Math.max(0, due - paid),
    }
  })
  const left = lines.reduce((total, line) => total + line.left, 0)

  return (
    <Paper
      aria-label={text.title}
      component="section"
      p={24}
      radius="lg"
      withBorder
    >
      <Title order={2}>{text.title}</Title>
      <Text c="dimmed" mb={16} size="sm">
        {text.description}
      </Text>
      <Stack gap={14}>
        {lines.map((line) => (
          <div key={line.category}>
            <Group justify="space-between">
              <Text fw={600} size="sm">
                {fr.categories[line.category]}
              </Text>
              <Text c="dimmed" size="xs">
                {text.yearForecast(formatCents(line.yearForecast))}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text c="dimmed" size="xs">
                {text.spent(formatCents(line.spent))}
              </Text>
              <Text c="dimmed" size="xs">
                {text.due(formatCents(line.due))}
              </Text>
            </Group>
            <Text c={line.left > 0 ? 'red.4' : 'teal.4'} mb={4} size="sm">
              {text.paid(formatCents(line.paid), formatCents(line.left))}
            </Text>
            <TargetGauge
              ariaLabel={fr.professional.mixedCosts.gaugeAria(
                fr.categories[line.category],
                formatCents(line.paid),
                formatCents(line.due),
              )}
              goal="atLeast"
              real={line.paid}
              target={line.due}
            />
          </div>
        ))}
      </Stack>
      <Group
        justify="space-between"
        mt={20}
        pt={12}
        style={{ borderTop: '1px solid var(--app-border)' }}
      >
        <Text c="dimmed" size="sm">
          {text.left}
        </Text>
        <Text c={left > 0 ? 'red.4' : 'teal.4'} fw={700}>
          {formatCents(left)}
        </Text>
      </Group>
    </Paper>
  )
}

import { Group, Paper, Text, Title, Tooltip } from '@mantine/core'
import type { ProfessionalMonth } from '@server/lib/professional/types'

import { finalOf } from '@/features/professional/final-amount'
import { formatCents, monthName, shortMonthName } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

import classes from './revenue-chart.module.css'

/**
 * Histogramme du CA HT par mois : barre pleine = réel, contour pointillé = prévisionnel restant,
 * trait = prévu d'origine, petite barre bleue = charges pro. En CSS (pas de lib de graphiques).
 */
export function RevenueChart({
  year,
  months,
}: {
  year: number
  months: readonly ProfessionalMonth[]
}) {
  const text = fr.professional.year.chart
  const max = Math.max(
    ...months.flatMap((month) => [
      finalOf(month.revenue),
      month.revenue.forecast,
      finalOf(month.charges.total),
    ]),
    1,
  )
  const height = (cents: number) => `${(Math.max(0, cents) / max) * 100}%`

  return (
    <Paper
      aria-label={text.title}
      component="section"
      mb={16}
      p={24}
      radius="lg"
      withBorder
    >
      <Group justify="space-between" mb={20}>
        <Title order={2}>{text.title}</Title>
        <Group gap={16}>
          <Legend className={classes.legendActual} label={text.actual} />
          <Legend
            className={classes.legendForecast}
            label={text.forecastLeft}
          />
          <Legend
            className={classes.legendMarker}
            label={text.originalForecast}
          />
          <Legend className={classes.legendCharges} label={text.charges} />
        </Group>
      </Group>
      <div aria-label={text.aria(year)} className={classes.chart} role="img">
        {months.map((month) => (
          <Tooltip
            key={month.month}
            label={text.bar(
              monthName(month.month),
              formatCents(finalOf(month.revenue)),
              formatCents(month.revenue.forecast),
              formatCents(finalOf(month.charges.total)),
            )}
          >
            <div className={classes.column}>
              <div className={classes.bars}>
                <div
                  className={classes.revenue}
                  data-forecast={!month.hasActual || undefined}
                  style={{ height: height(finalOf(month.revenue)) }}
                />
                <div
                  className={classes.charges}
                  style={{ height: height(finalOf(month.charges.total)) }}
                />
                {month.hasActual && (
                  <div
                    className={classes.marker}
                    style={{ bottom: height(month.revenue.forecast) }}
                  />
                )}
              </div>
              <Text c="dimmed" size="xs" ta="center">
                {shortMonthName(month.month)}
              </Text>
            </div>
          </Tooltip>
        ))}
      </div>
    </Paper>
  )
}

function Legend({ className, label }: { className?: string; label: string }) {
  return (
    <Group gap={6} wrap="nowrap">
      <span aria-hidden className={className} />
      <Text c="dimmed" size="xs">
        {label}
      </Text>
    </Group>
  )
}

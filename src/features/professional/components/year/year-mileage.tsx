import { Paper, SimpleGrid, Text, Title, Tooltip } from '@mantine/core'
import type { ProfessionalMonth } from '@server/lib/professional/types'

import { formatCents, monthName, shortMonthName } from '@/lib/format'
import { fr, LOCALE } from '@/lib/i18n/fr'

import classes from './year-mileage.module.css'

const kmFormat = new Intl.NumberFormat(LOCALE)
const rateFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 })

/** « Frais kilométriques · année » : réalisé à ce jour, prévu de l'année, km par mois. */
export function YearMileage({
  months,
}: {
  months: readonly ProfessionalMonth[]
}) {
  const text = fr.professional.year.mileage
  const kmOf = (month: ProfessionalMonth) =>
    month.mileage.actualKm ?? month.mileage.forecastKm
  const toDate = months.filter((month) => month.hasActual)
  const toDateKm = toDate.reduce(
    (total, month) => total + (month.mileage.actualKm ?? 0),
    0,
  )
  const toDateCents = toDate.reduce(
    (total, month) => total + (month.mileage.amount.actual ?? 0),
    0,
  )
  const yearKm = months.reduce((total, month) => total + kmOf(month), 0)
  const yearCents = months.reduce(
    (total, month) =>
      total + (month.mileage.amount.actual ?? month.mileage.amount.forecast),
    0,
  )
  const max = Math.max(...months.map(kmOf), 1)
  const rateMilli = months.at(-1)?.mileage.rateMilli ?? 0
  const km = (value: number) =>
    fr.professional.mileage.km(kmFormat.format(value))

  return (
    <Paper
      aria-label={text.title}
      component="section"
      p={24}
      radius="lg"
      withBorder
    >
      <Title mb={16} order={2}>
        {text.title}
      </Title>
      <SimpleGrid cols={2} mb={16} spacing={16}>
        <div>
          <Text c="dimmed" size="xs">
            {text.toDate}
          </Text>
          <Text fw={600}>{km(toDateKm)}</Text>
          <Text c="dimmed" size="xs">
            {formatCents(toDateCents)}
          </Text>
        </div>
        <div>
          <Text c="dimmed" size="xs">
            {text.yearForecast}
          </Text>
          <Text fw={600}>{km(yearKm)}</Text>
          <Text c="dimmed" size="xs">
            {formatCents(yearCents)}
          </Text>
        </div>
      </SimpleGrid>
      <div aria-label={text.barsAria} className={classes.bars} role="img">
        {months.map((month) => (
          <Tooltip
            key={month.month}
            label={text.bar(
              monthName(month.month),
              kmFormat.format(kmOf(month)),
            )}
          >
            <div className={classes.column}>
              <div
                className={classes.bar}
                data-forecast={!month.hasActual || undefined}
                style={{ height: `${(kmOf(month) / max) * 100}%` }}
              />
              <Text c="dimmed" size="xs" ta="center">
                {shortMonthName(month.month).charAt(0).toUpperCase()}
              </Text>
            </div>
          </Tooltip>
        ))}
      </div>
      <Text c="dimmed" mt={12} size="xs">
        {fr.professional.mileage.rate(
          fr.professional.mileage.rateUnit(rateFormat.format(rateMilli / 1000)),
        )}
      </Text>
    </Paper>
  )
}

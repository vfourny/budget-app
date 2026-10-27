import { Grid, Group } from '@mantine/core'
import { sumFinal } from '@shared/professional/amounts.util'
import type { ProfessionalMonth } from '@shared/professional/professional.type'

import { InfoTip } from '@/components/info-tip'
import { KpiCard } from '@/components/kpi-card'
import { formatCents, monthName } from '@/lib/format'
import { fr, LOCALE } from '@/lib/i18n/fr'

const kmFormat = new Intl.NumberFormat(LOCALE)

/** Cartes de la vue année : CA final, bénéfice final, TVA réelle cumulée, frais km. */
export function YearKpis({ months }: { months: readonly ProfessionalMonth[] }) {
  const text = fr.professional.year.kpis
  const actualMonths = months.filter((month) => month.hasActual)
  const lastActual = actualMonths.at(-1)
  const km = months.reduce(
    (total, month) =>
      total + (month.mileage.actualKm ?? month.mileage.forecastKm),
    0,
  )
  const mixedLeft = actualMonths.reduce(
    (total, month) => total + month.mixedCosts.leftToRefundCents,
    0,
  )

  const cards = [
    {
      label: text.revenue,
      tip: text.revenueTip,
      value: formatCents(sumFinal(months.map((month) => month.revenue))),
      color: 'gold.6',
      hint: text.revenueSub(
        formatCents(
          actualMonths.reduce(
            (total, month) => total + (month.revenue.actual ?? 0),
            0,
          ),
        ),
        formatCents(
          months.reduce((total, month) => total + month.revenue.forecast, 0),
        ),
      ),
    },
    {
      label: text.profit,
      tip: text.profitTip,
      value: formatCents(sumFinal(months.map((month) => month.profit))),
      hint: text.profitSub,
    },
    {
      label: text.vat,
      tip: text.vatTip,
      value: formatCents(sumFinal(months.map((month) => month.vat.due))),
      color: 'blue.3',
      hint: lastActual
        ? text.vatSub(monthName(1), monthName(lastActual.month))
        : text.vatForecast,
    },
    {
      label: text.mileage,
      tip: text.mileageTip,
      value: formatCents(sumFinal(months.map((month) => month.mileage.amount))),
      hint: text.mileageSub(kmFormat.format(km), formatCents(mixedLeft)),
    },
  ]

  return (
    <Grid align="stretch" gap={16} mb={16}>
      {cards.map((card) => (
        <Grid.Col key={card.label} span={{ base: 12, sm: 6, lg: 3 }}>
          <KpiCard
            color={card.color}
            hint={card.hint}
            label={
              <Group gap={4}>
                {card.label}
                <InfoTip
                  ariaLabel={fr.professional.howComputed(card.label)}
                  label={card.tip}
                />
              </Group>
            }
            value={card.value}
          />
        </Grid.Col>
      ))}
    </Grid>
  )
}

import { Grid } from "@mantine/core";

import { KpiCard } from "@/components/kpi-card";
import { finalOf, sumFinal } from "@/features/professional/final-amount";
import { formatCents, monthName } from "@/lib/format";
import { LOCALE, fr } from "@/lib/i18n/fr";
import type { ProfessionalMonth } from "@server/lib/professional/types";

const kmFormat = new Intl.NumberFormat(LOCALE);

/** Cartes de la vue année : CA final, bénéfice final, TVA réelle cumulée, frais km. */
export function YearKpis({ months }: { months: readonly ProfessionalMonth[] }) {
  const text = fr.professional.year.kpis;
  const actualMonths = months.filter((month) => month.hasActual);
  const lastActual = actualMonths.at(-1);
  const km = months.reduce(
    (total, month) => total + (month.mileage.actualKm ?? month.mileage.forecastKm),
    0,
  );
  const mixedLeft = actualMonths.reduce(
    (total, month) => total + month.mixedCosts.leftToRefundCents,
    0,
  );

  const cards = [
    {
      label: text.revenue,
      value: formatCents(sumFinal(months.map((month) => month.revenue))),
      color: "gold.6",
      hint: text.revenueSub(
        formatCents(actualMonths.reduce((total, month) => total + (month.revenue.actual ?? 0), 0)),
        formatCents(months.reduce((total, month) => total + month.revenue.forecast, 0)),
      ),
    },
    {
      label: text.profit,
      value: formatCents(sumFinal(months.map((month) => month.profit))),
      hint: text.profitSub,
    },
    {
      label: text.vat,
      value: formatCents(actualMonths.reduce((total, month) => total + finalOf(month.vat.due), 0)),
      color: "blue.3",
      hint: lastActual ? text.vatSub(monthName(1), monthName(lastActual.month)) : text.noActual,
    },
    {
      label: text.mileage,
      value: formatCents(sumFinal(months.map((month) => month.mileage.amount))),
      hint: text.mileageSub(kmFormat.format(km), formatCents(mixedLeft)),
    },
  ];

  return (
    <Grid gap={16} mb={16} align="stretch">
      {cards.map((card) => (
        <Grid.Col key={card.label} span={{ base: 12, sm: 6, lg: 3 }}>
          <KpiCard label={card.label} value={card.value} hint={card.hint} color={card.color} />
        </Grid.Col>
      ))}
    </Grid>
  );
}

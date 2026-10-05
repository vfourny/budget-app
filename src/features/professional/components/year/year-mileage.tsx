import { Paper, SimpleGrid, Text, Title, Tooltip } from "@mantine/core";

import { formatCents, monthName, shortMonthName } from "@/lib/format";
import { LOCALE, fr } from "@/lib/i18n/fr";
import type { ProMonth } from "@server/lib/pro/types";

import classes from "./year-mileage.module.css";

const kmFormat = new Intl.NumberFormat(LOCALE);
const rateFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 });

/** « Frais kilométriques · année » : réalisé à ce jour, prévu de l'année, km par mois. */
export function YearMileage({ months }: { months: readonly ProMonth[] }) {
  const text = fr.professional.year.mileage;
  const kmOf = (month: ProMonth) => month.mileage.actualKm ?? month.mileage.forecastKm;
  const toDate = months.filter((month) => month.hasActual);
  const toDateKm = toDate.reduce((total, month) => total + (month.mileage.actualKm ?? 0), 0);
  const toDateCents = toDate.reduce(
    (total, month) => total + (month.mileage.amount.actual ?? 0),
    0,
  );
  const yearKm = months.reduce((total, month) => total + kmOf(month), 0);
  const yearCents = months.reduce(
    (total, month) => total + (month.mileage.amount.actual ?? month.mileage.amount.forecast),
    0,
  );
  const max = Math.max(...months.map(kmOf), 1);
  const rateMilli = months.at(-1)?.mileage.rateMilli ?? 0;
  const km = (value: number) => fr.professional.mileage.km(kmFormat.format(value));

  return (
    <Paper withBorder radius="lg" p={24} component="section" aria-label={text.title}>
      <Title order={2} mb={16}>
        {text.title}
      </Title>
      <SimpleGrid cols={2} spacing={16} mb={16}>
        <div>
          <Text size="xs" c="dimmed">
            {text.toDate}
          </Text>
          <Text fw={600}>{km(toDateKm)}</Text>
          <Text size="xs" c="dimmed">
            {formatCents(toDateCents)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            {text.yearForecast}
          </Text>
          <Text fw={600}>{km(yearKm)}</Text>
          <Text size="xs" c="dimmed">
            {formatCents(yearCents)}
          </Text>
        </div>
      </SimpleGrid>
      <div className={classes.bars} role="img" aria-label={text.barsAria}>
        {months.map((month) => (
          <Tooltip
            key={month.month}
            label={text.bar(monthName(month.month), kmFormat.format(kmOf(month)))}
          >
            <div className={classes.column}>
              <div
                className={classes.bar}
                data-forecast={!month.hasActual || undefined}
                style={{ height: `${(kmOf(month) / max) * 100}%` }}
              />
              <Text size="xs" c="dimmed" ta="center">
                {shortMonthName(month.month).charAt(0).toUpperCase()}
              </Text>
            </div>
          </Tooltip>
        ))}
      </div>
      <Text size="xs" c="dimmed" mt={12}>
        {fr.professional.mileage.rate(
          fr.professional.mileage.rateUnit(rateFormat.format(rateMilli / 1000)),
        )}
      </Text>
    </Paper>
  );
}

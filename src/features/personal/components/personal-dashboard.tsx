import {
  ActionIcon,
  Alert,
  Button,
  Grid,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Select,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router";

import { PageHeader, PageTitleAccent } from "@/components/page-header";
import { CategoryBreakdown } from "@/features/personal/components/category-breakdown";
import { KpiCards } from "@/features/personal/components/kpi-cards";
import { TransactionsTable } from "@/features/personal/components/transactions-table";
import { useOverview, usePeriods } from "@/features/personal/hooks/use-personal";
import { capitalizedMonthName, monthName } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

type View = "month" | "year";
interface Period {
  year: number;
  month: number;
}

const periodKey = (period: Period) => `${period.year}-${period.month}`;

export function PersonalDashboard() {
  const periods = usePeriods();
  const [view, setView] = useState<View>("month");
  // `null` tant que l'utilisateur n'a rien choisi : on affiche alors la période la plus récente
  // (valeur dérivée pendant le rendu, plutôt qu'un `useEffect` qui recopierait la requête).
  const [chosen, setChosen] = useState<Period | null>(null);

  if (periods.isPending) return <Loader color="gold" />;
  if (periods.isError) return <Alert color="red" title={fr.personal.loadFailed} />;

  if (periods.data.length === 0) {
    return (
      <>
        <PageHeader eyebrow={fr.personal.eyebrow} title={fr.nav.personal} />
        <Paper withBorder radius="lg" p={28}>
          <Group justify="space-between">
            <span>{fr.personal.empty}</span>
            <Button component={Link} to="/imports/new" variant="default">
              {fr.importForm.title}
            </Button>
          </Group>
        </Paper>
      </>
    );
  }

  const selected = chosen ?? periods.data[0];
  const years = [...new Set(periods.data.map((period) => period.year))].sort((a, b) => a - b);
  const monthIndex = periods.data.findIndex((p) => periodKey(p) === periodKey(selected));
  // `periods.data` est trié du plus récent au plus ancien : « précédent » = index + 1.
  const previousMonth = periods.data[monthIndex + 1];
  const nextMonth = monthIndex > 0 ? periods.data[monthIndex - 1] : undefined;
  const yearIndex = years.indexOf(selected.year);

  function selectYear(year: number | undefined) {
    if (year === undefined) return;
    // On garde le mois choisi s'il existe cette année-là, sinon le plus récent de l'année.
    const inYear = periods.data?.filter((p) => p.year === year) ?? [];
    setChosen(inYear.find((p) => p.month === selected.month) ?? inYear[0] ?? null);
  }

  return (
    <>
      <PageHeader
        eyebrow={view === "month" ? fr.personal.eyebrowMonth : fr.personal.eyebrowYear}
        title={
          <>
            {view === "month" && `${capitalizedMonthName(selected.month)} `}
            <PageTitleAccent>{selected.year}</PageTitleAccent>
          </>
        }
        actions={
          <Group gap={12}>
            <SegmentedControl
              value={view}
              onChange={(value) => setView(value as View)}
              data={[
                { value: "month", label: fr.personal.views.month },
                { value: "year", label: fr.personal.views.year },
              ]}
            />
            {view === "month" ? (
              <Group gap={6}>
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label={fr.personal.previousMonth}
                  disabled={!previousMonth}
                  onClick={() => previousMonth && setChosen(previousMonth)}
                >
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <Select
                  aria-label={fr.personal.month}
                  w={190}
                  allowDeselect={false}
                  data={periods.data.map((period) => ({
                    value: periodKey(period),
                    label: `${monthName(period.month)} ${period.year}`,
                  }))}
                  value={periodKey(selected)}
                  onChange={(value) =>
                    setChosen(periods.data.find((p) => periodKey(p) === value) ?? null)
                  }
                />
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label={fr.personal.nextMonth}
                  disabled={!nextMonth}
                  onClick={() => nextMonth && setChosen(nextMonth)}
                >
                  <IconChevronRight size={16} />
                </ActionIcon>
              </Group>
            ) : (
              <Group gap={6}>
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label={fr.personal.previousYear}
                  disabled={yearIndex <= 0}
                  onClick={() => selectYear(years[yearIndex - 1])}
                >
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label={fr.personal.nextYear}
                  disabled={yearIndex >= years.length - 1}
                  onClick={() => selectYear(years[yearIndex + 1])}
                >
                  <IconChevronRight size={16} />
                </ActionIcon>
              </Group>
            )}
          </Group>
        }
      />
      <PeriodContent view={view} period={selected} />
    </>
  );
}

function PeriodContent({ view, period }: { view: View; period: Period }) {
  const overview = useOverview(period.year, view === "month" ? period.month : undefined);

  if (overview.isPending) return <Loader color="gold" />;
  if (overview.isError) return <Alert color="red" title={fr.personal.loadPeriodFailed} />;

  return (
    <>
      <KpiCards view={view} overview={overview.data} />
      <Grid mt={16} gap={16}>
        {view === "month" && (
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <TransactionsTable transactions={overview.data.transactions} />
          </Grid.Col>
        )}
        <Grid.Col span={{ base: 12, lg: view === "month" ? 4 : 12 }}>
          <CategoryBreakdown overview={overview.data} />
        </Grid.Col>
      </Grid>
    </>
  );
}

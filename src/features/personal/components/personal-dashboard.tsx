import {
  ActionIcon,
  Alert,
  Button,
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
  if (periods.isError) return <Alert color="red" title="Impossible de charger le dashboard." />;

  if (periods.data.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Budget perso" title="Perso" />
        <Paper withBorder radius="lg" p={28}>
          <Group justify="space-between">
            <span>
              Aucun import validé pour le moment : le dashboard se remplit à la validation.
            </span>
            <Button component={Link} to="/imports/nouveau" variant="default">
              Importer un relevé
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
        eyebrow={view === "month" ? "Vue du mois" : "Vue de l'année"}
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
                { value: "month", label: "Mois" },
                { value: "year", label: "Année" },
              ]}
            />
            {view === "month" ? (
              <Group gap={6}>
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label="Mois précédent"
                  disabled={!previousMonth}
                  onClick={() => previousMonth && setChosen(previousMonth)}
                >
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <Select
                  aria-label="Mois"
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
                  aria-label="Mois suivant"
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
                  aria-label="Année précédente"
                  disabled={yearIndex <= 0}
                  onClick={() => selectYear(years[yearIndex - 1])}
                >
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label="Année suivante"
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
  if (overview.isError) return <Alert color="red" title="Impossible de charger la période." />;

  return (
    <>
      <KpiCards view={view} overview={overview.data} />
      {view === "month" && <TransactionsTable transactions={overview.data.transactions} />}
      <CategoryBreakdown overview={overview.data} />
    </>
  );
}

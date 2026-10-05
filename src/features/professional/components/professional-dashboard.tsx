import { ActionIcon, Alert, Button, Grid, Group, Loader, Tooltip } from "@mantine/core";
import { IconCalendarEvent, IconListDetails, IconUpload } from "@tabler/icons-react";
import { Link } from "react-router";

import { PageHeader, PageTitleAccent } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { TransactionsTable } from "@/components/transactions-table";
import { RevenueKpiCard } from "@/features/professional/components/month/revenue-kpi-card";
import { useProMonth, useProPeriods } from "@/features/professional/hooks/use-professional";
import { usePeriodSelection, type Period } from "@/hooks/use-period-selection";
import { capitalizedMonthName } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

/** Lien vers l'import, type de compte « Pro » déjà choisi. */
const IMPORT_PRO_URL = "/imports/new?accountType=PROFESSIONAL";

export function ProfessionalDashboard() {
  const periods = useProPeriods();
  // Par défaut : le mois en cours (le sélecteur propose aussi les mois à venir, en prévisionnel).
  const today = new Date();
  const { view, setView, selected, select } = usePeriodSelection({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });

  if (periods.isPending) return <Loader color="gold" />;
  if (periods.isError || !selected) return <Alert color="red" title={fr.professional.loadFailed} />;

  return (
    <>
      <PageHeader
        eyebrow={fr.professional.eyebrow(
          view === "month" ? fr.period.eyebrowMonth : fr.period.eyebrowYear,
        )}
        title={
          <>
            {view === "month" && `${capitalizedMonthName(selected.month)} `}
            <PageTitleAccent>{selected.year}</PageTitleAccent>
          </>
        }
        actions={
          <Group gap={12}>
            <Tooltip label={fr.professional.importStatement}>
              <ActionIcon
                component={Link}
                to={IMPORT_PRO_URL}
                variant="default"
                size="lg"
                aria-label={fr.professional.importStatement}
              >
                <IconUpload size={16} />
              </ActionIcon>
            </Tooltip>
            <PeriodPicker
              view={view}
              onViewChange={setView}
              periods={periods.data}
              selected={selected}
              onSelect={select}
            />
          </Group>
        }
      />
      {view === "month" ? <MonthContent period={selected} /> : null}
    </>
  );
}

function MonthContent({ period }: { period: Period }) {
  const month = useProMonth(period.year, period.month);

  if (month.isPending) return <Loader color="gold" />;
  if (month.isError) return <Alert color="red" title={fr.professional.loadPeriodFailed} />;

  const data = month.data;
  return (
    <>
      {!data.hasActual && (
        <Alert color="gray" icon={<IconCalendarEvent size={16} />} mb={16}>
          {fr.professional.futureMonth}
        </Alert>
      )}
      <Group justify="flex-end" mb={12}>
        <Button
          component="a"
          href="#transactions"
          variant="subtle"
          size="compact-sm"
          leftSection={<IconListDetails size={14} />}
        >
          {fr.professional.transactionsLink(data.transactions.length)}
        </Button>
      </Group>
      <Grid gap={16} mb={16} align="stretch">
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <RevenueKpiCard month={data} />
        </Grid.Col>
      </Grid>
      <TransactionsTable
        transactions={data.transactions}
        emptyText={data.hasActual ? undefined : fr.professional.futureTransactions}
      />
    </>
  );
}

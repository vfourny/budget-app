import { ActionIcon, Alert, Button, Grid, Group, Loader, Stack, Tooltip } from "@mantine/core";
import { IconCalendarEvent, IconEdit, IconListDetails, IconUpload } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router";

import { PageHeader, PageTitleAccent } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { TransactionsTable } from "@/components/transactions-table";
import {
  ForecastEditorModal,
  type EditorTarget,
} from "@/features/professional/components/forecast-editor/forecast-editor-modal";
import { BillingCard } from "@/features/professional/components/month/billing-card";
import { CategoryForecastCard } from "@/features/professional/components/month/category-forecast-card";
import { MileageCard } from "@/features/professional/components/month/mileage-card";
import { MixedCostsCard } from "@/features/professional/components/month/mixed-costs-card";
import { ProfitCard } from "@/features/professional/components/month/profit-card";
import { RevenueKpiCard } from "@/features/professional/components/month/revenue-kpi-card";
import { VatCard } from "@/features/professional/components/month/vat-card";
import { RevenueChart } from "@/features/professional/components/year/revenue-chart";
import { YearKpis } from "@/features/professional/components/year/year-kpis";
import {
  useProMonth,
  useProPeriods,
  useProYear,
} from "@/features/professional/hooks/use-professional";
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
      {view === "month" ? <MonthContent period={selected} /> : <YearContent year={selected.year} />}
    </>
  );
}

function MonthContent({ period }: { period: Period }) {
  const month = useProMonth(period.year, period.month);
  // Modale du prévisionnel : `null` = fermée, sinon l'onglet et la source à ouvrir.
  const [editor, setEditor] = useState<EditorTarget | null>(null);

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
          variant="default"
          size="compact-sm"
          leftSection={<IconEdit size={14} />}
          onClick={() => setEditor({ tab: "billing", source: "FORECAST" })}
        >
          {fr.professional.editor.open}
        </Button>
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
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <RevenueKpiCard month={data} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <VatCard month={data} />
        </Grid.Col>
        <Grid.Col span={12}>
          <ProfitCard month={data} />
        </Grid.Col>
        <Grid.Col span={12}>
          <BillingCard
            month={data}
            action={
              data.hasActual && (
                <Button
                  variant="light"
                  size="compact-sm"
                  onClick={() => setEditor({ tab: "billing", source: "ACTUAL" })}
                >
                  {fr.professional.editor.enterActual}
                </Button>
              )
            }
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <CategoryForecastCard month={data} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap={16}>
            <MixedCostsCard month={data} />
            <MileageCard month={data} />
          </Stack>
        </Grid.Col>
      </Grid>
      <TransactionsTable
        transactions={data.transactions}
        emptyText={data.hasActual ? undefined : fr.professional.futureTransactions}
      />
      {editor && (
        <ForecastEditorModal
          period={period}
          hasActual={data.hasActual}
          settings={data.settings}
          initial={editor}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}

function YearContent({ year }: { year: number }) {
  const months = useProYear(year);

  if (months.isPending) return <Loader color="gold" />;
  if (months.isError) return <Alert color="red" title={fr.professional.loadPeriodFailed} />;

  return (
    <>
      <YearKpis months={months.data} />
      <RevenueChart year={year} months={months.data} />
    </>
  );
}

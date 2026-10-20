import { Alert, Button, Grid, Group, Loader, Paper } from '@mantine/core'
import { Link } from 'react-router'

import { PageHeader, PageTitleAccent } from '@/components/page-header'
import { PeriodPicker } from '@/components/period-picker'
import { TransactionsTable } from '@/components/transactions-table'
import { CategoryBreakdown } from '@/features/personal/components/category-breakdown'
import { FixedChargesCard } from '@/features/personal/components/fixed-charges-card'
import { KpiCards } from '@/features/personal/components/kpi-cards'
import { useOverview, usePeriods } from '@/features/personal/hooks/use-personal'
import {
  type Period,
  type PeriodView,
  usePeriodSelection,
} from '@/hooks/use-period-selection'
import { capitalizedMonthName } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

export function PersonalDashboard() {
  const periods = usePeriods()
  // Par défaut : la période la plus récente qui a des données.
  const { view, setView, selected, select } = usePeriodSelection(
    periods.data?.[0],
  )

  if (periods.isPending) return <Loader color="gold" />
  if (periods.isError)
    return <Alert color="red" title={fr.personal.loadFailed} />

  if (!selected) {
    return (
      <>
        <PageHeader eyebrow={fr.personal.eyebrow} title={fr.nav.personal} />
        <Paper p={28} radius="lg" withBorder>
          <Group justify="space-between">
            <span>{fr.personal.empty}</span>
            <Button component={Link} to="/imports/new" variant="default">
              {fr.importForm.title}
            </Button>
          </Group>
        </Paper>
      </>
    )
  }

  return (
    <>
      <PageHeader
        actions={
          <PeriodPicker
            onSelect={select}
            onViewChange={setView}
            periods={periods.data}
            selected={selected}
            view={view}
          />
        }
        eyebrow={
          view === 'month' ? fr.period.eyebrowMonth : fr.period.eyebrowYear
        }
        title={
          <>
            {view === 'month' && `${capitalizedMonthName(selected.month)} `}
            <PageTitleAccent>{selected.year}</PageTitleAccent>
          </>
        }
      />
      <PeriodContent period={selected} view={view} />
    </>
  )
}

function PeriodContent({ view, period }: { view: PeriodView; period: Period }) {
  const overview = useOverview(
    period.year,
    view === 'month' ? period.month : undefined,
  )

  if (overview.isPending) return <Loader color="gold" />
  if (overview.isError)
    return <Alert color="red" title={fr.personal.loadPeriodFailed} />

  return (
    <>
      <KpiCards overview={overview.data} view={view} year={period.year} />
      <FixedChargesCard fixedCharges={overview.data.fixedCharges} />
      <Grid gap={16} mt={16}>
        {view === 'month' && (
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <TransactionsTable transactions={overview.data.transactions} />
          </Grid.Col>
        )}
        <Grid.Col span={{ base: 12, lg: view === 'month' ? 4 : 12 }}>
          <CategoryBreakdown overview={overview.data} />
        </Grid.Col>
      </Grid>
    </>
  )
}

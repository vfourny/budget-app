import { Alert, Button, Chip, Group, Loader, Stack, Text } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { PageHeader, PageTitleAccent } from '@/components/page-header'
import { PeriodPicker } from '@/components/period-picker'
import { TransactionsTable } from '@/components/transactions-table'
import { ApartmentCard } from '@/features/apartments/components/apartment-card'
import { ApartmentKpis } from '@/features/apartments/components/apartment-kpis'
import { LmnpThresholds } from '@/features/apartments/components/lmnp-thresholds'
import {
  useApartmentPeriods,
  useApartmentsMonth,
  useApartmentsYear,
} from '@/features/apartments/hooks/use-apartments-dashboard'
import { type Period, usePeriodSelection } from '@/hooks/use-period-selection'
import { capitalizedMonthName } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

const SETTINGS_URL = '/settings?tab=apt'

export function ApartmentsDashboard() {
  const periods = useApartmentPeriods()
  // Par défaut : le dernier mois clos (la vue ne propose que les mois terminés, R1).
  const { view, setView, selected, select } = usePeriodSelection(
    periods.data?.[0],
  )
  // Pastille : `null` = « Tous ».
  const [apartmentId, setApartmentId] = useState<string | null>(null)

  if (periods.isPending) return <Loader color="gold" />
  if (periods.isError)
    return <Alert color="red" title={fr.apartments.loadFailed} />

  const header = (
    <PageHeader
      actions={
        <Group gap={12}>
          <Button
            component={Link}
            leftSection={<IconPlus size={16} />}
            to={SETTINGS_URL}
            variant="default"
          >
            {fr.apartments.addApartment}
          </Button>
          {selected && (
            <PeriodPicker
              onSelect={select}
              onViewChange={setView}
              periods={periods.data}
              selected={selected}
              view={view}
            />
          )}
        </Group>
      }
      eyebrow={fr.apartments.eyebrow(
        view === 'month' ? fr.period.eyebrowMonth : fr.period.eyebrowYear,
      )}
      title={
        selected ? (
          <>
            {view === 'month' && `${capitalizedMonthName(selected.month)} `}
            <PageTitleAccent>{selected.year}</PageTitleAccent>
          </>
        ) : (
          fr.apartments.title
        )
      }
    />
  )

  if (!selected) {
    return (
      <>
        {header}
        <Text c="dimmed">{fr.apartments.noPeriod}</Text>
      </>
    )
  }

  return (
    <>
      {header}
      {view === 'month' ? (
        <MonthContent
          apartmentId={apartmentId}
          onApartmentChange={setApartmentId}
          period={selected}
        />
      ) : (
        <YearContent
          apartmentId={apartmentId}
          onApartmentChange={setApartmentId}
          year={selected.year}
        />
      )}
    </>
  )
}

interface PillsProps {
  apartmentId: string | null
  onApartmentChange: (apartmentId: string | null) => void
  options: readonly { id: string; name: string }[]
}

/** Pastilles « Tous (n) » + une par appartement actif sur la période. */
function ApartmentPills({
  options,
  apartmentId,
  onApartmentChange,
}: PillsProps) {
  return (
    <Chip.Group
      multiple={false}
      onChange={(value) => onApartmentChange(value === 'all' ? null : value)}
      value={apartmentId ?? 'all'}
    >
      <Group aria-label={fr.apartments.filtersAria} gap={8} role="group">
        <Chip value="all" variant="light">
          {fr.apartments.all(options.length)}
        </Chip>
        {options.map((option) => (
          <Chip key={option.id} value={option.id} variant="light">
            {option.name}
          </Chip>
        ))}
      </Group>
    </Chip.Group>
  )
}

interface MonthContentProps {
  apartmentId: string | null
  onApartmentChange: (apartmentId: string | null) => void
  period: Period
}

function MonthContent({
  period,
  apartmentId,
  onApartmentChange,
}: MonthContentProps) {
  const month = useApartmentsMonth(period.year, period.month, apartmentId)

  if (month.isPending) return <Loader color="gold" />
  if (month.isError)
    return <Alert color="red" title={fr.apartments.loadPeriodFailed} />

  const { options, apartments, kpis, transactions } = month.data
  return (
    <Stack gap={16}>
      <ApartmentPills
        apartmentId={apartmentId}
        onApartmentChange={onApartmentChange}
        options={options}
      />

      {apartments.length === 0 ? (
        <Text c="dimmed">{fr.apartments.noneActive}</Text>
      ) : (
        <>
          <ApartmentKpis kpis={kpis} view="month" />
          {apartments.map((apartment) => (
            <ApartmentCard
              apartment={apartment}
              key={apartment.id}
              period={period}
            />
          ))}
        </>
      )}

      <TransactionsTable
        emptyText={fr.apartments.transactions.empty}
        transactions={transactions}
      />
    </Stack>
  )
}

function YearContent({
  year,
  apartmentId,
  onApartmentChange,
}: {
  year: number
  apartmentId: string | null
  onApartmentChange: (apartmentId: string | null) => void
}) {
  const data = useApartmentsYear(year, apartmentId)

  if (data.isPending) return <Loader color="gold" />
  if (data.isError)
    return <Alert color="red" title={fr.apartments.loadPeriodFailed} />

  const { options, apartments, kpis, thresholds } = data.data
  return (
    <Stack gap={16}>
      <ApartmentPills
        apartmentId={apartmentId}
        onApartmentChange={onApartmentChange}
        options={options}
      />
      {apartments.length === 0 ? (
        <Text c="dimmed">{fr.apartments.noneActive}</Text>
      ) : (
        <>
          <ApartmentKpis kpis={kpis} view="year" />
          {apartments.map((apartment) => (
            <ApartmentCard
              apartment={apartment}
              key={apartment.id}
              period={{ year, month: null }}
            />
          ))}
        </>
      )}
      {thresholds && <LmnpThresholds thresholds={thresholds} />}
    </Stack>
  )
}

import { Alert, Button, Chip, Group, Loader, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router";

import { PageHeader, PageTitleAccent } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { TransactionsTable } from "@/components/transactions-table";
import { ApartmentCard } from "@/features/apartments/components/apartment-card";
import { ApartmentKpis } from "@/features/apartments/components/apartment-kpis";
import {
  useApartmentPeriods,
  useApartmentsMonth,
} from "@/features/apartments/hooks/use-apartments-dashboard";
import { usePeriodSelection, type Period } from "@/hooks/use-period-selection";
import { capitalizedMonthName } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

const SETTINGS_URL = "/settings?tab=apt";

export function ApartmentsDashboard() {
  const periods = useApartmentPeriods();
  // Par défaut : le dernier mois clos (la vue ne propose que les mois terminés, R1).
  const { view, setView, selected, select } = usePeriodSelection(periods.data?.[0]);
  // Pastille : `null` = « Tous ».
  const [apartmentId, setApartmentId] = useState<string | null>(null);

  if (periods.isPending) return <Loader color="gold" />;
  if (periods.isError) return <Alert color="red" title={fr.apartments.loadFailed} />;

  const header = (
    <PageHeader
      eyebrow={fr.apartments.eyebrow(
        view === "month" ? fr.period.eyebrowMonth : fr.period.eyebrowYear,
      )}
      title={
        selected ? (
          <>
            {view === "month" && `${capitalizedMonthName(selected.month)} `}
            <PageTitleAccent>{selected.year}</PageTitleAccent>
          </>
        ) : (
          fr.apartments.title
        )
      }
      actions={
        <Group gap={12}>
          <Button
            component={Link}
            to={SETTINGS_URL}
            variant="default"
            leftSection={<IconPlus size={16} />}
          >
            {fr.apartments.addApartment}
          </Button>
          {selected && (
            <PeriodPicker
              view={view}
              onViewChange={setView}
              periods={periods.data}
              selected={selected}
              onSelect={select}
            />
          )}
        </Group>
      }
    />
  );

  if (!selected) {
    return (
      <>
        {header}
        <Text c="dimmed">{fr.apartments.noPeriod}</Text>
      </>
    );
  }

  return (
    <>
      {header}
      {view === "month" ? (
        <MonthContent
          period={selected}
          apartmentId={apartmentId}
          onApartmentChange={setApartmentId}
        />
      ) : (
        <Text c="dimmed">{fr.apartments.yearSoon}</Text>
      )}
    </>
  );
}

interface MonthContentProps {
  period: Period;
  apartmentId: string | null;
  onApartmentChange: (apartmentId: string | null) => void;
}

function MonthContent({ period, apartmentId, onApartmentChange }: MonthContentProps) {
  const month = useApartmentsMonth(period.year, period.month, apartmentId);

  if (month.isPending) return <Loader color="gold" />;
  if (month.isError) return <Alert color="red" title={fr.apartments.loadPeriodFailed} />;

  const { options, apartments, kpis, transactions } = month.data;
  return (
    <Stack gap={16}>
      <Chip.Group
        multiple={false}
        value={apartmentId ?? "all"}
        onChange={(value) => onApartmentChange(value === "all" ? null : value)}
      >
        <Group gap={8} role="group" aria-label={fr.apartments.filtersAria}>
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

      {apartments.length === 0 ? (
        <Text c="dimmed">{fr.apartments.noneActive}</Text>
      ) : (
        <>
          <ApartmentKpis kpis={kpis} />
          {apartments.map((apartment) => (
            <ApartmentCard key={apartment.id} apartment={apartment} period={period} />
          ))}
        </>
      )}

      <TransactionsTable transactions={transactions} emptyText={fr.apartments.transactions.empty} />
    </Stack>
  );
}

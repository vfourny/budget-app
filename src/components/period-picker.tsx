import { ActionIcon, Group, SegmentedControl, Select } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { periodKey, type Period, type PeriodView } from "@/hooks/use-period-selection";
import { monthName } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

interface PeriodPickerProps {
  view: PeriodView;
  onViewChange: (view: PeriodView) => void;
  /** Périodes proposées, de la plus récente à la plus ancienne. */
  periods: readonly Period[];
  selected: Period;
  onSelect: (period: Period) => void;
}

/**
 * Bascule Mois / Année + navigation : flèches et liste des mois en vue mois, flèches par année en
 * vue année. Partagé par les dashboards Perso et Pro.
 */
export function PeriodPicker({
  view,
  onViewChange,
  periods,
  selected,
  onSelect,
}: PeriodPickerProps) {
  const years = [...new Set(periods.map((period) => period.year))].sort((a, b) => a - b);
  const monthIndex = periods.findIndex((p) => periodKey(p) === periodKey(selected));
  // `periods` est trié du plus récent au plus ancien : « précédent » = index + 1.
  const previousMonth = periods[monthIndex + 1];
  const nextMonth = monthIndex > 0 ? periods[monthIndex - 1] : undefined;
  const yearIndex = years.indexOf(selected.year);

  function selectYear(year: number | undefined) {
    if (year === undefined) return;
    // On garde le mois choisi s'il existe cette année-là, sinon le plus récent de l'année.
    const inYear = periods.filter((p) => p.year === year);
    const next = inYear.find((p) => p.month === selected.month) ?? inYear[0];
    if (next) onSelect(next);
  }

  return (
    <Group gap={12}>
      <SegmentedControl
        value={view}
        onChange={(value) => onViewChange(value as PeriodView)}
        data={[
          { value: "month", label: fr.period.views.month },
          { value: "year", label: fr.period.views.year },
        ]}
      />
      {view === "month" ? (
        <Group gap={6}>
          <ActionIcon
            variant="default"
            size="lg"
            aria-label={fr.period.previousMonth}
            disabled={!previousMonth}
            onClick={() => previousMonth && onSelect(previousMonth)}
          >
            <IconChevronLeft size={16} />
          </ActionIcon>
          <Select
            aria-label={fr.period.month}
            w={190}
            allowDeselect={false}
            data={periods.map((period) => ({
              value: periodKey(period),
              label: `${monthName(period.month)} ${period.year}`,
            }))}
            value={periodKey(selected)}
            onChange={(value) => {
              const period = periods.find((p) => periodKey(p) === value);
              if (period) onSelect(period);
            }}
          />
          <ActionIcon
            variant="default"
            size="lg"
            aria-label={fr.period.nextMonth}
            disabled={!nextMonth}
            onClick={() => nextMonth && onSelect(nextMonth)}
          >
            <IconChevronRight size={16} />
          </ActionIcon>
        </Group>
      ) : (
        <Group gap={6}>
          <ActionIcon
            variant="default"
            size="lg"
            aria-label={fr.period.previousYear}
            disabled={yearIndex <= 0}
            onClick={() => selectYear(years[yearIndex - 1])}
          >
            <IconChevronLeft size={16} />
          </ActionIcon>
          <ActionIcon
            variant="default"
            size="lg"
            aria-label={fr.period.nextYear}
            disabled={yearIndex >= years.length - 1}
            onClick={() => selectYear(years[yearIndex + 1])}
          >
            <IconChevronRight size={16} />
          </ActionIcon>
        </Group>
      )}
    </Group>
  );
}

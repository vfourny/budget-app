import { capitalRepaid } from "@server/lib/apartments/loan";
import {
  computeApartmentYear,
  periodColumns,
  yieldsBps,
  type ApartmentPeriodColumns,
} from "@server/lib/apartments/compute-period";
import type { LoadedApartmentData } from "@server/lib/apartments/load-period";
import { currentYearMonth, type YearMonth } from "@server/lib/apartments/period";
import { computeThresholds } from "@server/lib/apartments/thresholds";
import type { ApartmentRecord } from "@server/lib/apartments/types";
import type { MonthResult } from "@server/lib/apartments/compute-month";

interface ViewParams {
  year: number;
  /** `null` = vue année (mois clos de l'année). */
  month: number | null;
  /** Pastille : un seul appartement (`null` = tous). Les seuils LMNP ignorent ce filtre. */
  apartmentId: string | null;
  now?: YearMonth;
}

/** Un appartement actif sur la période, avec ses colonnes Prévisionnel / Réalisé. */
function buildApartment(
  apartment: ApartmentRecord,
  months: readonly MonthResult[],
  params: ViewParams,
) {
  const columns = periodColumns(apartment, months);
  const through = months.at(-1);
  return {
    id: apartment.id,
    name: apartment.name,
    kind: apartment.kind,
    managerName: apartment.managerName,
    acquiredAt: apartment.acquiredAt,
    priceCents: apartment.priceCents,
    rentCents: apartment.rentCents,
    depositCents: apartment.depositCents,
    ...columns,
    /** Facture de gérance du mois affiché (vue mois, bien géré) : pré-remplit le formulaire (R12). */
    invoice: params.month === null ? null : (months[0]?.invoice ?? null),
    /** Capital remboursé jusqu'à la fin de la période affichée, plafonnée au dernier mois clos (R6). */
    capital: through ? capitalRepaid(apartment.loan, through) : null,
    yields:
      params.month === null ? yieldsBps(apartment, columns.actual, columns.closedMonths) : null,
  };
}

/**
 * Vue d'une période (mois ou année) : appartements actifs, KPI (R8), seuils LMNP (R10, vue année)
 * et transactions du mois. Assemble les calculs purs de `compute-*` sur les données chargées.
 */
export function buildApartmentsView(data: LoadedApartmentData, params: ViewParams) {
  const now = params.now ?? currentYearMonth();
  const { year, month } = params;

  const all = data.apartments.flatMap((apartment) => {
    const results = computeApartmentYear({
      apartment,
      year,
      now,
      openingBalanceCents: data.openings.get(apartment.id) ?? 0,
      transactions: data.transactions.filter((t) => t.apartmentId === apartment.id),
      invoices: data.invoices.get(apartment.id) ?? new Map(),
    });
    // Vue mois : le mois demandé s'il est actif ; vue année : les mois clos.
    const months =
      month === null ? results.filter((r) => r.closed) : results.filter((r) => r.month === month);
    return months.length > 0 ? [{ apartment, months }] : [];
  });

  const shown = all.filter(
    ({ apartment }) => params.apartmentId === null || apartment.id === params.apartmentId,
  );
  const apartments = shown.map(({ apartment, months }) =>
    buildApartment(apartment, months, params),
  );

  const columnsOf = (
    items: typeof all,
  ): { apartment: ApartmentRecord; columns: ApartmentPeriodColumns }[] =>
    items.map(({ apartment, months }) => ({
      apartment,
      columns: periodColumns(apartment, months),
    }));

  // KPI (R8) sur les appartements affichés.
  const kpiColumns = columnsOf(shown).map(({ columns }) => columns);
  const sum = (pick: (columns: ApartmentPeriodColumns) => number) =>
    kpiColumns.reduce((total, columns) => total + pick(columns), 0);
  const periodClosedMonths = Math.max(0, ...kpiColumns.map((columns) => columns.closedMonths));
  const effortActualCents = sum((c) => c.actual?.effortCents ?? 0);
  const kpis = {
    rent: {
      netReceivedCents: sum((c) => c.actual?.lines.netRent ?? 0),
      grossReceivedCents: sum((c) => c.actual?.lines.grossRent ?? 0),
      managementFeesCents: sum(
        (c) => (c.actual?.lines.managementFees ?? 0) + (c.actual?.lines.extraManagementFees ?? 0),
      ),
      dueCents: sum((c) => c.rentDueCents),
    },
    effort: {
      actualCents: effortActualCents,
      forecastCents: sum((c) => c.forecast.effortCents),
      contributionCents: sum((c) => c.actual?.lines.ownerContribution ?? 0),
      perMonthCents:
        periodClosedMonths > 0 ? Math.round(effortActualCents / periodClosedMonths) : 0,
    },
  };

  return {
    /** Pastilles : tous les appartements actifs sur la période, avant filtre. */
    options: all.map(({ apartment }) => ({ id: apartment.id, name: apartment.name })),
    apartments,
    kpis,
    thresholds: month === null ? computeThresholds(year, columnsOf(all)) : null,
  };
}

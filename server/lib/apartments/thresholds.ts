import { LMP_THRESHOLD_CENTS, microBicCeilingCents } from "@shared/apartment-rules";
import type { ApartmentRecord } from "@server/lib/apartments/types";
import type { ApartmentPeriodColumns } from "@server/lib/apartments/compute-period";

export interface LmnpThresholds {
  /** Recettes de janvier au dernier mois clos, tous appartements LMNP actifs confondus. */
  receiptsCents: number;
  /** Projection annuelle : Σ par appartement de (recettes ÷ mois clos × 12). */
  projectedCents: number;
  microBicCeilingCents: number;
  lmpThresholdCents: number;
}

/**
 * Seuils LMNP (R10), à titre indicatif : les recettes sont les loyers bruts perçus (net + frais de
 * gérance) des appartements meublés. La condition « plus de 50 % des revenus » du statut LMP n'est
 * pas calculée.
 */
export function computeThresholds(
  year: number,
  apartments: readonly { apartment: ApartmentRecord; columns: ApartmentPeriodColumns }[],
): LmnpThresholds {
  let receiptsCents = 0;
  let projectedCents = 0;
  for (const { apartment, columns } of apartments) {
    if (apartment.kind !== "FURNISHED" || !columns.actual || columns.closedMonths === 0) continue;
    const receipts = columns.actual.lines.grossRent;
    receiptsCents += receipts;
    projectedCents += Math.round((receipts / columns.closedMonths) * 12);
  }
  return {
    receiptsCents,
    projectedCents,
    microBicCeilingCents: microBicCeilingCents(year),
    lmpThresholdCents: LMP_THRESHOLD_CENTS,
  };
}

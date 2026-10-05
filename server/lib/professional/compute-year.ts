import { computeMonth } from "@server/lib/professional/compute-month";
import type { ProfessionalMonth, ProfessionalMonthInput } from "@server/lib/professional/types";

/** Ce qui se reporte d'un mois sur le suivant. */
export interface YearOpening {
  /** TVA à reverser de décembre de l'année précédente (payée en janvier). */
  previousVatDueCents: number;
  /** Reste à encaisser (TTC, cumulé) au 1er janvier. */
  receivablesCents: number;
}

/**
 * Calcule les 12 mois d'une année dans l'ordre, en reportant d'un mois sur l'autre :
 * - la TVA payée un mois = la TVA à reverser du mois précédent (réelle, sinon prévue) ;
 * - le reste à encaisser cumulé (inchangé pendant les mois à venir).
 */
export function computeYear(
  months: readonly Omit<
    ProfessionalMonthInput,
    "previousVatDueCents" | "openingReceivablesCents"
  >[],
  opening: YearOpening,
): ProfessionalMonth[] {
  const results: ProfessionalMonth[] = [];
  let previousVatDueCents = opening.previousVatDueCents;
  let openingReceivablesCents = opening.receivablesCents;
  for (const month of months) {
    const result = computeMonth({ ...month, previousVatDueCents, openingReceivablesCents });
    results.push(result);
    previousVatDueCents = result.vat.due.actual ?? result.vat.due.forecast;
    openingReceivablesCents = result.billing.receivablesCents ?? openingReceivablesCents;
  }
  return results;
}

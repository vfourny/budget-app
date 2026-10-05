import { computeMonth } from "@server/lib/pro/compute-month";
import type { ProMonth, ProMonthInput } from "@server/lib/pro/types";

/**
 * Calcule les 12 mois d'une année dans l'ordre : la TVA payée un mois est la TVA à reverser du mois
 * précédent (réelle si le mois a un réel, sinon prévue). `previousDecemberVatDueCents` = celle de
 * décembre de l'année d'avant.
 */
export function computeYear(
  months: readonly Omit<ProMonthInput, "previousVatDueCents">[],
  previousDecemberVatDueCents: number,
): ProMonth[] {
  const results: ProMonth[] = [];
  let previousVatDueCents = previousDecemberVatDueCents;
  for (const month of months) {
    const result = computeMonth({ ...month, previousVatDueCents });
    results.push(result);
    previousVatDueCents = result.vat.due.actual ?? result.vat.due.forecast;
  }
  return results;
}

import { useState } from "react";

export type PeriodView = "month" | "year";

export interface Period {
  year: number;
  /** 1-12 */
  month: number;
}

export const periodKey = (period: Period) => `${period.year}-${period.month}`;

/**
 * État du sélecteur de période d'un dashboard (≈ un composable Vue) : vue mois / année et période
 * choisie. Tant que l'utilisateur n'a rien choisi, la période affichée est `fallback` (la plus
 * récente, par ex.) : valeur dérivée pendant le rendu plutôt qu'un `useEffect` qui recopierait la
 * requête dans l'état.
 */
export function usePeriodSelection(fallback: Period | undefined) {
  const [view, setView] = useState<PeriodView>("month");
  const [chosen, setChosen] = useState<Period | null>(null);

  return { view, setView, selected: chosen ?? fallback, select: setChosen };
}

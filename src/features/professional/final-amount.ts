import type { ForecastActual } from "@server/lib/professional/types";

/** Valeur « finale » d'un mois : le réel s'il existe, sinon le prévu (mois à venir). */
export const finalOf = (amount: ForecastActual): number => amount.actual ?? amount.forecast;

/** Somme des valeurs finales (réel + prévu restant). */
export const sumFinal = (amounts: readonly ForecastActual[]): number =>
  amounts.reduce((total, amount) => total + finalOf(amount), 0);

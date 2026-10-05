import type { Amount } from "@server/lib/pro/types";

/** Valeur « finale » d'un mois : le réel s'il existe, sinon le prévu (mois à venir). */
export const finalOf = (amount: Amount): number => amount.actual ?? amount.forecast;

/** Somme des valeurs finales (réel + prévu restant). */
export const sumFinal = (amounts: readonly Amount[]): number =>
  amounts.reduce((total, amount) => total + finalOf(amount), 0);

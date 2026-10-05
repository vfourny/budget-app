import type { Amount } from "@server/lib/pro/types";

/** `cents × bp / 10 000`, arrondi au centime. */
export function applyBp(cents: number, bp: number): number {
  return Math.round((cents * bp) / 10_000);
}

/** Montant HT d'un montant TTC au taux `vatBp`. */
export function htFromTtc(ttcCents: number, vatBp: number): number {
  return Math.round((ttcCents * 10_000) / (10_000 + vatBp));
}

/** Valeur prévue + réelle (réel `null` sans réel). */
export function amount(forecast: number, actual: number | null): Amount {
  return { forecast, actual };
}

/** Applique `fn` au prévu et au réel (le réel reste `null` s'il l'est). */
export function mapAmount(value: Amount, fn: (cents: number) => number): Amount {
  return { forecast: fn(value.forecast), actual: value.actual === null ? null : fn(value.actual) };
}

/** Somme de plusieurs montants ; le réel est `null` si l'un d'eux l'est. */
export function sumAmounts(values: readonly Amount[]): Amount {
  let forecast = 0;
  let actual: number | null = 0;
  for (const value of values) {
    forecast += value.forecast;
    actual = actual === null || value.actual === null ? null : actual + value.actual;
  }
  return { forecast, actual };
}

/** `a − b` sur le prévu et le réel. */
export function subtractAmounts(a: Amount, b: Amount): Amount {
  return {
    forecast: a.forecast - b.forecast,
    actual: a.actual === null || b.actual === null ? null : a.actual - b.actual,
  };
}

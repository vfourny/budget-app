/**
 * Mois civils (1-12) : le seul endroit qui sait passer d'une année à l'autre. Toutes les dates
 * métier sont en UTC (`@db.Date`), donc le mois d'une date et le mois en cours aussi.
 */

/** Un mois (1-12) d'une année. */
export interface YearMonth {
  month: number
  year: number
}

/** Rang d'un mois sur une échelle continue : comparer / itérer sans gérer le passage d'année. */
export function monthIndex({ year, month }: YearMonth): number {
  return year * 12 + month - 1
}

/** Mois (UTC) d'une date. */
export function yearMonthOf(date: Date): YearMonth {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

/** Mois en cours (UTC). */
export function currentYearMonth(now = new Date()): YearMonth {
  return yearMonthOf(now)
}

/** `a` est-il strictement avant `b` ? */
export function isBefore(a: YearMonth, b: YearMonth): boolean {
  return monthIndex(a) < monthIndex(b)
}

/** Même mois ? */
export function isSameMonth(a: YearMonth, b: YearMonth): boolean {
  return monthIndex(a) === monthIndex(b)
}

/** Tri chronologique (pour `Array.prototype.sort`). */
export function compareMonths(a: YearMonth, b: YearMonth): number {
  return monthIndex(a) - monthIndex(b)
}

/** Mois précédent (décembre N-1 pour janvier N). */
export function previousMonth({ year, month }: YearMonth): YearMonth {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 }
}

/** Mois suivant (janvier N+1 pour décembre N). */
export function nextMonth({ year, month }: YearMonth): YearMonth {
  return month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 }
}

/** Mois de `from` à `to` inclus, dans l'ordre (vide si `to` est avant `from`). */
export function monthsBetween(from: YearMonth, to: YearMonth): YearMonth[] {
  const months: YearMonth[] = []
  for (let cursor = from; !isBefore(to, cursor); cursor = nextMonth(cursor)) {
    months.push(cursor)
  }
  return months
}

/** Mois restants de l'année après `month` (`month + 1` → 12). */
export function followingMonthsOfYear(month: number): number[] {
  return Array.from({ length: 12 - month }, (_, index) => month + 1 + index)
}

/** Jour civil d'une date, à minuit UTC (comme `@db.Date`). */
export function utcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

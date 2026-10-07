/** Mois civil (1-12). */
export interface YearMonth {
  year: number;
  month: number;
}

/** Mois en cours (UTC) : un mois est « clos » quand il lui est antérieur (R1, hypothèse H1). */
export function currentYearMonth(date = new Date()): YearMonth {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

const index = ({ year, month }: YearMonth) => year * 12 + month;

export function isMonthClosed(period: YearMonth, now: YearMonth): boolean {
  return index(period) < index(now);
}

/** Un appartement est actif à partir de son mois d'acquisition, mois inclus (R1). */
export function isActiveIn(acquiredAt: Date, period: YearMonth): boolean {
  return (
    index({ year: acquiredAt.getUTCFullYear(), month: acquiredAt.getUTCMonth() + 1 }) <=
    index(period)
  );
}

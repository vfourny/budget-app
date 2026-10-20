import {
  isBefore,
  type YearMonth,
  yearMonthOf,
} from '@shared/common/year-month.util'

/** Un mois est « clos » quand il est antérieur au mois en cours (R1, hypothèse H1). */
export function isMonthClosed(period: YearMonth, now: YearMonth): boolean {
  return isBefore(period, now)
}

/** Un appartement est actif à partir de son mois d'acquisition, mois inclus (R1). */
export function isActiveIn(acquiredAt: Date, period: YearMonth): boolean {
  return !isBefore(period, yearMonthOf(acquiredAt))
}

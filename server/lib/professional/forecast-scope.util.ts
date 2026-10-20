import { followingMonthsOfYear } from '@shared/common/year-month.util'

/** Un mois du prévisionnel d'un utilisateur : la clé de toutes les saisies de l'éditeur. */
export interface ForecastScope {
  month: number
  userId: string
  year: number
}

/**
 * « Appliquer aux mois suivants » : les mois de la fin de l'année (après `month`) et le filtre Prisma
 * qui les sélectionne. Chaque copie supprime ces mois puis les recrée, en une transaction SQL.
 */
export function followingMonthsScope({ userId, year, month }: ForecastScope) {
  const months = followingMonthsOfYear(month)
  return { months, where: { userId, year, month: { in: months } } }
}

/** Le même mois, un an plus tôt : la valeur par défaut d'une saisie vide (réel N-1). */
export function sameMonthLastYear(scope: ForecastScope): ForecastScope {
  return { ...scope, year: scope.year - 1 }
}

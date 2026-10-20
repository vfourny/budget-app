import { z } from 'zod'

/** Année saisie ou demandée (bornes larges, juste pour écarter les valeurs absurdes). */
export const yearSchema = z.number().int().min(2000).max(2100)

/** Mois civil, 1-12. */
export const monthSchema = z.number().int().min(1).max(12)

/** Un mois d'une année. */
export const yearMonthSchema = z.object({
  year: yearSchema,
  month: monthSchema,
})

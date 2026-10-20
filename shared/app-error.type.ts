/**
 * Erreurs « métier » renvoyées au front sous forme de **code**, jamais de texte : le serveur ne
 * connaît pas la langue de l'UI. Le front traduit chaque code dans `src/lib/i18n/fr/errors.ts`
 * (dictionnaire exhaustif : un code ajouté ici sans traduction casse `tsc`).
 */
export type AppErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'IMPORT_NOT_FOUND'
  | 'IMPORT_ALREADY_VALIDATED'
  | 'TRANSACTION_NOT_FOUND'
  | 'CATEGORY_NOT_ALLOWED'
  | 'TRIP_NOT_FOUND'
  | 'APARTMENT_NOT_FOUND'
  | 'APARTMENT_HAS_TRANSACTIONS'
  | 'APARTMENT_REQUIRED'
  | 'APARTMENT_NO_MANAGER'
  | 'APARTMENT_NOT_ALLOWED'
  | 'UNKNOWN_CSV_FORMAT'
  | 'NO_READABLE_TRANSACTIONS'
  | 'ALL_ROWS_ALREADY_IMPORTED'
  | 'REMAINING_TO_REVIEW'
  | 'GEMINI_QUOTA_EXCEEDED'
  | 'GEMINI_REFUSED'
  | 'CATEGORIZATION_FAILED'
  | 'CSV_FORMAT_DETECTION_FAILED'

/** Paramètres d'interpolation des codes qui en ont besoin (les autres n'en prennent pas). */
export interface AppErrorParams {
  REMAINING_TO_REVIEW: { remaining: number }
}

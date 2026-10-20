import type {
  DetectionCheckCode,
  ParsedBankStatement,
} from '@shared/transactions/csv.type'

const MIN_PLAUSIBLE_DATE = Date.UTC(2000, 0, 1)
const ONE_MONTH_MS = 31 * 24 * 60 * 60 * 1000

/** Contrôles de cohérence : un mapping faux (mauvaise colonne de date, de libellé…) se voit
 * presque toujours ici, avant que quoi que ce soit soit écrit en base. */
export function checkParsedStatement(
  parsed: ParsedBankStatement,
  now: Date = new Date(),
): DetectionCheckCode[] {
  const checks: DetectionCheckCode[] = []
  if (parsed.transactions.length === 0) checks.push('NO_TRANSACTIONS')
  if (parsed.errors.length > 0) checks.push('UNREADABLE_LINES')

  const latest = now.getTime() + ONE_MONTH_MS
  const outOfRange = parsed.transactions.some(
    (transaction) =>
      transaction.date.getTime() < MIN_PLAUSIBLE_DATE ||
      transaction.date.getTime() > latest,
  )
  if (outOfRange) checks.push('DATES_OUT_OF_RANGE')
  if (parsed.transactions.some((transaction) => transaction.label === '')) {
    checks.push('EMPTY_LABELS')
  }
  return checks
}

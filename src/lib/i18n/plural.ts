/**
 * Accord en nombre, règle française : 0 et 1 → singulier, au-delà → pluriel.
 * `pluralize(2, "import")` → "imports" ; `pluralize(2, "ligne ignorée", "lignes ignorées")` pour
 * les locutions (le pluriel régulier ne fait qu'ajouter un « s » à la fin).
 */
export function pluralize(count: number, one: string, many = `${one}s`): string {
  return count > 1 ? many : one;
}

/** Nombre + mot accordé : `plural(3, "ligne")` → "3 lignes". */
export function plural(count: number, one: string, many?: string): string {
  return `${count} ${pluralize(count, one, many)}`;
}

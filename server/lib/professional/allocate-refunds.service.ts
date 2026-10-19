/**
 * Répartit un montant remboursé sur des montants dus, dans l'ordre (le premier est soldé d'abord).
 * Un trop-perçu va sur la dernière ligne, pour que la somme répartie = le montant remboursé.
 */
export function allocateRefunds(
  paidCents: number,
  dues: readonly number[],
): number[] {
  let left = paidCents
  const allocated = dues.map((due) => {
    const share = Math.max(0, Math.min(left, due))
    left -= share
    return share
  })
  const last = allocated.length - 1
  if (left > 0 && last >= 0) allocated[last] = (allocated[last] ?? 0) + left
  return allocated
}

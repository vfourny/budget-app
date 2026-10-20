/**
 * Répartit un montant remboursé sur des montants dus, dans l'ordre (le premier est soldé d'abord).
 * La dernière ligne prend tout ce qui reste, trop-perçu compris, pour que la somme répartie = le
 * montant remboursé.
 */
export function allocateRefunds(
  paidCents: number,
  dues: readonly number[],
): number[] {
  let left = paidCents
  return dues.map((due, index) => {
    const isLast = index === dues.length - 1
    const share = Math.max(0, isLast ? left : Math.min(left, due))
    left -= share
    return share
  })
}

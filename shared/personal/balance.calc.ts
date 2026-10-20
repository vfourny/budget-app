import { monthIndex, type YearMonth } from '@shared/year-month.util'

/** Solde réel saisi en fin de mois (`AccountBalance`). */
export interface BalanceAnchor extends YearMonth {
  balanceCents: number
}

/** Somme signée des transactions validées d'un mois. */
export interface MonthNet extends YearMonth {
  cents: number
}

export interface MonthEndBalance extends YearMonth {
  /** Solde en fin de mois (centimes) ; `null` tant qu'aucun repère n'existe à ce mois ou avant. */
  cents: number | null
  /**
   * Repère saisi pour ce mois : saisie − solde calculé depuis le repère précédent. `null` si le
   * mois n'a pas de saisie ou s'il n'y a pas de repère avant (rien à comparer).
   */
  driftCents: number | null
  /** `true` si la valeur vient d'une saisie (sinon elle est calculée). */
  isAnchor: boolean
}

/**
 * Solde en fin de mois, calcul pur : repère le plus récent à ce mois ou avant + transactions des
 * mois qui suivent le repère, jusqu'au mois demandé inclus. Un repère sur le mois même l'emporte
 * (le calcul depuis le repère précédent ne sert qu'à mesurer l'écart).
 */
export function balanceAtEndOf(
  target: YearMonth,
  anchors: readonly BalanceAnchor[],
  monthNets: readonly MonthNet[],
): MonthEndBalance {
  const targetIndex = monthIndex(target)
  const sorted = anchors
    .filter((anchor) => monthIndex(anchor) <= targetIndex)
    .sort((a, b) => monthIndex(b) - monthIndex(a))
  const [latest, previous] = sorted

  function computedFrom(anchor: BalanceAnchor | undefined): number | null {
    if (!anchor) return null
    const from = monthIndex(anchor)
    return monthNets.reduce((sum, net) => {
      const index = monthIndex(net)
      return index > from && index <= targetIndex ? sum + net.cents : sum
    }, anchor.balanceCents)
  }

  if (latest && monthIndex(latest) === targetIndex) {
    const computed = computedFrom(previous)
    return {
      ...target,
      cents: latest.balanceCents,
      isAnchor: true,
      driftCents: computed === null ? null : latest.balanceCents - computed,
    }
  }
  return {
    ...target,
    cents: computedFrom(latest),
    isAnchor: false,
    driftCents: null,
  }
}

/** Dashboard Perso. */
export const personal = {
  eyebrow: "Budget perso",
  eyebrowMonth: "Vue du mois",
  eyebrowYear: "Vue de l'année",
  loadFailed: "Impossible de charger le dashboard.",
  loadPeriodFailed: "Impossible de charger la période.",
  empty: "Aucun import validé pour le moment : le dashboard se remplit à la validation.",
  views: { month: "Mois", year: "Année" },
  month: "Mois",
  previousMonth: "Mois précédent",
  nextMonth: "Mois suivant",
  previousYear: "Année précédente",
  nextYear: "Année suivante",
  // Cards KPI
  kpi: {
    expensesMonth: "Dépenses",
    expensesYear: "Dépensé sur la période",
    expensesHint: "Hors épargne",
    revenuesHint: "Tous les crédits",
    savingsMonth: "Épargne du mois",
    savingsYear: "Épargné",
    savingsHint: (ratePercent: number) => `${ratePercent} % des revenus`,
    averageExpense: "Dépense moyenne / mois",
    monthsWithData: (count: number) => `${count} mois avec données`,
  },
  // Jauges réel vs recommandé
  gauge: {
    howComputed: (name: string) => `Comment est calculé « ${name} » ?`,
    tooltip: (source: string, recommendedPercent: number) =>
      `${source} Recommandé : ${recommendedPercent} % des revenus de la période.`,
    aria: (name: string, real: string, recommended: string) =>
      `${name} : ${real} sur ${recommended} recommandés`,
  },
  /** Explication de la somme « réelle » d'une enveloppe (tooltip des jauges). */
  envelopeSource: {
    empty: "Aucune catégorie rattachée pour l'instant : le réel reste à 0 €.",
    expenses: (labels: readonly string[]) =>
      `Total des dépenses des catégories : ${labels.join(", ")}.`,
    savings: (labels: readonly string[]) =>
      `Total des virements d'épargne des catégories : ${labels.join(", ")}.`,
  },
  breakdown: {
    title: "Par catégorie",
    empty: "Aucune dépense sur cette période.",
  },
  transactions: {
    title: "Transactions",
    empty: "Aucune transaction pour ce mois.",
  },
} as const;

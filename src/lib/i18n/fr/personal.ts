/** Dashboard Perso. */
export const personal = {
  eyebrow: 'Budget perso',
  loadFailed: 'Impossible de charger le dashboard.',
  loadPeriodFailed: 'Impossible de charger la période.',
  empty:
    'Aucun import validé pour le moment : le dashboard se remplit à la validation.',
  // Cards KPI
  kpi: {
    expensesMonth: 'Dépenses',
    expensesYear: 'Dépensé sur la période',
    expensesHint: 'Hors épargne',
    revenuesHint: 'Tous les crédits',
    savingsMonth: 'Épargne du mois',
    savingsYear: 'Épargné',
    savingsHint: (ratePercent: number) => `${ratePercent} % des revenus`,
    averageExpense: 'Dépense moyenne / mois',
    monthsWithData: (count: number) => `${count} mois avec données`,
    incomeTax: (year: number) => `IR estimé ${year}`,
    incomeTaxHint: 'Barème 1 part, avant réductions',
    incomeTaxMissing: (year: number) => `Barème de l'IR ${year} non renseigné.`,
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
      `Total des dépenses des catégories : ${labels.join(', ')}.`,
    savings: (labels: readonly string[]) =>
      `Total des virements d'épargne des catégories : ${labels.join(', ')}.`,
  },
  balance: {
    title: 'Solde du compte',
    openingMonth: 'Début de mois',
    closingMonth: 'Fin de mois',
    openingYear: "Début d'année",
    closingYear: "Fin d'année",
    variation: 'Variation',
    /** Date du solde affiché, ex. « fin février 2026 ». */
    endOf: (monthName: string, year: number) => `Fin ${monthName} ${year}`,
    anchored: 'saisi',
    computed: 'calculé',
    notSet: 'Non renseigné',
    edit: (label: string) => `Corriger : ${label}`,
    drift: (amount: string) =>
      `Écart de ${amount} avec le calcul : import manquant ou en double ?`,
    modal: {
      title: (monthName: string, year: number) =>
        `Solde réel fin ${monthName} ${year}`,
      help: 'Le solde indiqué sur ton relevé à cette date. Les mois suivants se calculent à partir de cette valeur.',
      amount: 'Solde (€)',
      clear: 'Effacer la saisie',
      failed: 'Enregistrement impossible',
    },
  },
  fixedCharges: {
    title: 'Charges fixes',
    total: 'Total',
  },
  breakdown: {
    title: 'Par catégorie',
  },
} as const

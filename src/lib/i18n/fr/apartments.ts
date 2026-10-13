import { plural } from '@/lib/i18n/plural'

/** Dashboard Appartements. Montants et nombres arrivent déjà formatés. */
export const apartments = {
  title: 'Appartements',
  eyebrow: (period: string) => `${period} · Appartements`,
  loadFailed: 'Impossible de charger le dashboard des appartements.',
  loadPeriodFailed: 'Impossible de charger la période.',
  addApartment: 'Ajouter un appartement',
  settings: 'Réglages',
  noApartment:
    'Aucun appartement enregistré. Ajoute ton premier bien dans les Réglages, puis importe le relevé de son compte.',
  noPeriod:
    "Aucun mois clos pour l'instant : les mois s'affichent une fois terminés, à partir de l'acquisition du premier bien.",
  noneActive: 'Aucun appartement actif sur cette période.',
  filtersAria: 'Filtrer par appartement',
  all: (count: number) => `Tous (${count})`,
  kpis: {
    rent: {
      label: 'Loyers nets perçus',
      tip: 'Loyers nets de frais de gérance reçus sur le compte appartement (virements « Loyer reçu »). La jauge compare les loyers bruts perçus (net + frais de gérance saisis) aux loyers dus : loyers bruts prévus des mois clos.',
      hint: (received: string, due: string, percent: string, fees: string) =>
        `${received} perçus sur ${due} dus (${percent} %) · gérance ${fees}`,
      missing: (amount: string) => `Il manque ${amount} de loyers`,
      complete: 'Tous les loyers dus sont perçus',
      gaugeAria: (received: string, due: string) =>
        `Loyers perçus : ${received} sur ${due} dus`,
    },
    effort: {
      label: "Effort d'épargne nécessaire",
      tip: "Somme des efforts mensuels : pour chaque mois, ce qu'il faut apporter pour que le compte appartement ne passe pas sous son solde (max(0, −différentiel)). Un mois excédentaire ne compense pas un mois déficitaire. La jauge compare l'apport réel (« Apport fonds perso ») à l'effort nécessaire.",
      hintMonth: (forecast: string) =>
        `À apporter ce mois-ci pour équilibrer le compte · prévu ${forecast}`,
      hintYear: (perMonth: string, forecast: string) =>
        `Soit ${perMonth} par mois en moyenne · prévu ${forecast}`,
      none: "Aucun apport nécessaire : le bien s'autofinance sur la période.",
      covered: (surplus: string) => `L'apport couvre l'effort (+ ${surplus})`,
      missing: (amount: string) => `Il manque ${amount} d'apport`,
      gaugeAria: (contribution: string, effort: string) =>
        `Apport : ${contribution} pour un effort nécessaire de ${effort}`,
    },
  },
  card: {
    direct: 'En direct',
    managed: 'En gérance',
    acquired: (month: string, year: number, price: string) =>
      `acquis en ${month} ${year} · ${price}`,
    capitalRepaid: 'Capital remboursé',
    capitalOf: (repaid: string, total: string, percent: string) =>
      `${repaid} sur ${total} · ${percent} %`,
    capitalAria: (percent: string) => `Capital remboursé : ${percent} %`,
    grossYield: 'Rendement brut',
    netYield: 'Rendement net',
    yieldTip:
      "Rendement annualisé sur les mois clos, sur le prix d'achat seul (hors frais). Brut : loyers bruts perçus. Net : loyers bruts moins les charges hors crédit (gérance, charges, taxe foncière, CFE…), hors capital, intérêts et assurance emprunteur.",
    yieldTipAria: (name: string) => `Comment est calculé « ${name} » ?`,
    missingInvoice: (months: string) =>
      `Facture de gérance à saisir : ${months}`,
  },
  table: {
    aria: (name: string) => `Prévisionnel, réalisé et écart de ${name}`,
    columns: {
      line: 'Ligne',
      forecast: 'Prévisionnel',
      actual: 'Réalisé',
      delta: 'Écart',
    },
    futureMonth: 'Mois à venir : seul le prévisionnel existe.',
    sections: {
      balance: 'Solde',
      rent: 'Loyers',
      credit: 'Crédit',
      fixed: 'Charges fixes',
      annual: 'Charges annuelles',
      other: 'Autres charges',
    },
    rows: {
      openingBalance: 'Solde début de mois',
      openingBalanceYear: "Solde début d'année",
      differential: 'Différentiel généré',
      ownerContribution: 'Apport fonds perso',
      closingBalance: 'Solde fin de mois',
      closingBalanceYear: 'Solde à ce jour',
      grossRent: 'Loyers bruts',
      grossRentSub: 'perçus + frais de gérance',
      managementFees: 'Frais de gérance',
      extraManagementFees: 'Frais de gérance supplémentaires',
      loanCapital: 'Capital remboursé',
      loanInterest: 'Intérêts',
      loanInsurance: 'Assurance emprunteur',
      loanTotal: 'Total remboursement crédit',
      effort: "Effort d'épargne nécessaire",
      electricity: 'Électricité',
      homeInsurance: 'Assurance habitation',
      internetBox: 'Box internet',
      condoFees: 'Charges de copropriété',
      propertyTax: 'Taxe foncière',
      cfe: 'CFE',
      bankFees: 'Frais bancaires',
      regularization: 'Régularisation de charges',
      other: 'Autres (non listé)',
    },
  },
  thresholds: {
    title: 'Seuils LMNP',
    note: "À titre indicatif, à valider avec le comptable : recettes de janvier au dernier mois clos des appartements meublés. La condition « plus de 50 % des revenus professionnels » du statut LMP n'est pas calculée.",
    receipts: (amount: string) => `${amount} de recettes`,
    projection: (amount: string) => `Projection sur l'année : ${amount}`,
    microBic: 'Plafond micro-BIC',
    microBicOf: (ceiling: string) => `sur ${ceiling}`,
    lmp: 'Seuil LMP',
    lmpOf: (threshold: string) => `sur ${threshold}`,
    over: 'Dépassé',
    gaugeAria: (name: string, receipts: string, limit: string) =>
      `${name} : ${receipts} sur ${limit}`,
  },
  editor: {
    open: 'Éditer le prévisionnel',
    title: (name: string) => `Prévisionnel · ${name}`,
    close: 'Fermer',
    month: 'Mois',
    hint: "Une saisie vaut pour le mois choisi. Le loyer, la taxe foncière (octobre) et la CFE (décembre) saisis valent aussi pour la suite, jusqu'à la saisie suivante. Sans saisie, les charges reprennent le réel du même mois l'an dernier, sinon la moyenne des mois clos. Le crédit vient du tableau d'amortissement et la gérance prévue du loyer × taux ci-dessous.",
    line: 'Ligne',
    forecast: 'Prévu',
    default: 'Par défaut',
    modified: 'modifié',
    amountAria: (label: string) => `Montant prévu : ${label}`,
    reset: 'Revenir aux valeurs par défaut',
    saved: 'Enregistré.',
    saveFailed: 'Enregistrement impossible',
    loadFailed: 'Impossible de charger le prévisionnel.',
    notActive: "L'appartement n'est pas encore acquis ce mois-là.",
    management: {
      title: 'Gérance',
      feeRate: 'Taux de gérance prévu',
      feeRateHint: 'En % du loyer brut, vaut pour tous les mois.',
      invoiceTitle: 'Facture de gérance du mois (réel)',
      invoiceHint:
        'Le loyer arrive net de frais : saisis les frais de la facture. Ils précisent la part brut / frais et les rendements, sans changer le solde.',
      invoiceNotClosed: 'La facture se saisit une fois le mois clos.',
      fees: 'Frais de gérance',
      extraFees: 'Frais supplémentaires',
      missing: 'Facture à saisir',
    },
  },
  transactions: {
    empty: 'Aucune transaction rattachée aux appartements pour ce mois.',
    count: (count: number) => plural(count, 'transaction'),
  },
} as const

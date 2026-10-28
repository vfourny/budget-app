import { plural } from '@/lib/i18n/plural'

/** Dashboard Pro (Stygma SAS). Montants et nombres arrivent déjà formatés. */
export const professional = {
  company: 'Stygma SAS',
  title: 'Pro',
  eyebrow: (period: string) => `${period} · Stygma SAS`,
  loadFailed: 'Impossible de charger le dashboard pro.',
  loadPeriodFailed: 'Impossible de charger la période.',
  futureMonth:
    "Mois à venir : seul le prévisionnel existe. Le réel se remplira à l'import des relevés et à la saisie des jours facturés.",
  transactionsLink: (count: number) => `Transactions (${count})`,
  importStatement: 'Importer un relevé pro',
  futureTransactions:
    "Mois à venir : les transactions apparaîtront après l'import du relevé.",
  forecastLabel: 'Prévisionnel',
  forecastValue: (amount: string) => `Prévu ${amount}`,
  howComputed: (name: string) => `Comment est calculé « ${name} » ?`,
  days: (days: string) => `${days} j`,
  forecastSub: (amount: string) => `prévu ${amount}`,
  forecastOnly: 'prévisionnel',
  vat: {
    title: 'TVA à reverser',
    tip: "TVA à reverser = TVA collectée − TVA déductible, calculée sur le CA et les charges du mois. En réel, pour des prestations de services, la TVA est exigible à l'encaissement (sauf option pour les débits) : une facture de décembre payée en janvier se déclare en janvier.",
    declareIn: (month: string) => `à déclarer en ${month}`,
    columns: { actual: 'Réel', forecast: 'Prévu' },
    signs: { collected: '+', deductible: '−', due: '=' },
    collected: 'TVA collectée',
    collectedSub: '20 % du CA',
    deductible: 'TVA déductible',
    deductibleSub: 'sur charges',
    due: 'À reverser',
    gap: {
      forecastOnly: 'Prévisionnel : pas encore de réel ce mois-ci',
      even: 'Pile le prévu',
      below: (amount: string) => `${amount} de moins que prévu`,
      above: (amount: string) => `${amount} de plus que prévu`,
    },
  },
  profit: {
    title: 'Bénéfice',
    tip: 'Bénéfice = CA HT − charges pro − salaires bruts − cotisations patronales. Les virements BNC vers ton perso ne sont pas une charge : ils ne changent pas le bénéfice.',
    splitAria:
      'Répartition du CA HT : charges, salaires, cotisations patronales, bénéfice',
    revenue: 'CA HT',
    revenueTip:
      "Chiffre d'affaires hors taxes du mois : ce que tu factures, avant TVA.",
    charges: 'Charges pro',
    chargesTip:
      'Charges de la société du mois, en HT : RC Pro, comptable, logiciels, frais bancaires, matériel, restauration, déplacements, frais mixtes remboursés… Hors salaires, cotisations et TVA.',
    salary: 'Salaires bruts',
    salaryTip:
      "Salaire que Stygma te verse en tant que président, avant retenues (cotisations salariales et prélèvement à la source). C'est une charge de la société.",
    employer: 'Cotisations patronales',
    employerTip:
      'Part employeur des cotisations sociales, en plus du salaire brut : salaire brut × taux patronal (Réglages › Pro). Réparties entre URSSAF, retraite complémentaire, complémentaire santé et prévoyance : détail dans le tableau par catégorie.',
    profitTip:
      "Ce qui reste du CA HT une fois payés les charges pro, les salaires bruts et les cotisations patronales. C'est ce sur quoi tu es imposé (quote-part de bénéfice), que tu le retires ou non.",
    bnc: 'Revenus BNC prélevés',
    bncTip:
      "Ce que Stygma te vire sur ton compte perso (virements « bnc » du relevé pro). C'est un prélèvement sur le bénéfice, pas une charge : il ne baisse que la trésorerie de la société.",
    retained: 'Reste en trésorerie',
    retainedTip:
      'Bénéfice − BNC prélevés : la part du bénéfice qui reste dans la société. Hors TVA et factures non encaissées.',
    socialCharges: 'Charges sociales sur bénéfice',
    socialChargesTip:
      'Taux × bénéfice (Réglages › Pro). La base est ta quote-part du bénéfice, retirée ou non. Se règle en perso : à mettre de côté. Taux à confirmer avec ton comptable. Bénéfice négatif = 0.',
    socialChargesSub: (rate: string) => `${rate} % du bénéfice`,
  },
  billing: {
    title: 'Facturation & encaissements',
    empty:
      'Aucune facturation pour ce mois : saisis les jours et le TJM dans le prévisionnel.',
    columns: {
      client: 'Client',
      calc: 'Jours × TJM',
      amount: 'HT · réel vs prévu',
    },
    amountTip:
      'Montants HT. La TVA est de 20 % sur chaque facture (voir la carte TVA) et le TTC est indiqué sous le nom du client. Vert au-dessus du prévu, rouge en dessous, doré pile.',
    ttc: (amount: string) => `TTC ${amount}`,
    forecastTtc: (amount: string) => `TTC prévu ${amount}`,
    collections: {
      invoiced: 'Facturé ce mois (TTC)',
      toInvoice: 'À facturer (TTC prévu)',
      collected: 'Encaissé ce mois (TTC)',
      receivables: 'Reste à encaisser (cumul)',
      receivablesTip:
        "Tout le facturé TTC moins tout l'encaissé (virements « Encaissement client »), depuis le début de la facturation dans l'app : les clients paient 1 à 2 mois après la facture, le solde absorbe ce décalage. Les virements reçus avant le premier mois facturé dans l'app paient des factures plus anciennes et ne sont pas déduits.",
    },
    calc: (days: string, rate: string) => `${days} j × ${rate}`,
    forecastCalc: (days: string, rate: string) => `prévu ${days} j × ${rate}`,
    gaugeAria: (client: string, real: string, forecast: string) =>
      `${client} : ${real} HT pour ${forecast} prévus`,
  },
  categories: {
    title: 'Prévisionnel vs réel · par catégorie',
    columns: {
      category: 'Catégorie',
      forecast: 'Prévu',
      actual: 'Réel',
      delta: 'Écart',
    },
    groups: {
      charges: 'Charges pro',
      remuneration: 'Rémunération & cotisations',
      taxes: 'Fiscalité',
    },
    vatRate: (rate: string) => `TVA ${rate} %`,
    mixedCosts: 'Frais mixtes (loyer, internet, téléphone, énergie)',
    mixedCostsSub: 'quote-part pro remboursée',
    totalCharges: 'Total charges pro',
    bnc: 'Revenus BNC',
    bncSub: 'prélevés sur le bénéfice',
    grossSalary: 'Salaires bruts',
    netSalarySub: (amount: string) => `net versé ${amount}`,
    employer: 'Cotisations patronales',
    rateOfGross: (rate: string) => `${rate} % du brut`,
    splitOf: (label: string) => `↳ ${label}`,
    employee: 'Cotisations salariales',
    employeeSub: (rate: string) =>
      `${rate} % du brut · retenues sur le salaire`,
    withholding: 'Prélèvement à la source',
    withholdingSub: (rate: string) =>
      `${rate} % du net imposable · avance d'IR`,
    socialCharges: 'Charges sociales sur bénéfice',
    socialChargesSub: (rate: string) =>
      `${rate} % de la quote-part · à régler en perso`,
    vat: 'TVA',
    vatSub: 'payée au titre du mois précédent',
  },
  mixedCosts: {
    title: 'Frais mixtes perso → pro',
    description:
      'Payés depuis le compte perso, Stygma rembourse sa quote-part.',
    tip: (area: string, key: string) =>
      `Loyer : au prorata de la surface du bureau (${area}). Autres frais : clé ${key}. Clés modifiables dans Réglages › Pro. Prévisionnel : tes dépenses perso du même mois l'an dernier. Pour le loyer, prévoir une convention écrite avec la société et l'accord du bailleur.`,
    areaKey: (office: string, home: string, share: string) =>
      `bureau ${office} m² / logement ${home} m² = ${share} %`,
    ratioKey: (numerator: number, denominator: number) =>
      `${numerator}/${denominator}`,
    lineTip: (spent: string, due: string, key: string) =>
      `Payé en perso : ${spent} · Dû par Stygma : ${due} · Clé : ${key}`,
    status: {
      forecast: 'Prévu',
      paid: 'Soldé',
      partial: 'Partiel',
      toRefund: 'À rembourser',
    },
    paidOfDue: (paid: string, due: string) => `${paid} / ${due}`,
    forecastDue: (due: string) => `Prévu ${due}`,
    gaugeAria: (label: string, paid: string, due: string) =>
      `${label} : ${paid} remboursés sur ${due} dus`,
    left: 'Reste à rembourser',
  },
  mileage: {
    title: 'Frais kilométriques',
    tip: (rate: string) =>
      `Kilomètres × barème (${rate}, Réglages › Pro). Montant à déclarer, pas une transaction bancaire. Prévisionnel : km du même mois l'an dernier, modifiable dans « Éditer le prévisionnel ».`,
    done: 'Réalisé ce mois',
    km: (km: string) => `${km} km`,
    toDeclare: (amount: string) => `${amount} à déclarer`,
    vsForecast: (delta: string) => `${delta} km vs prévu`,
    onForecast: 'Pile le prévu',
    rate: (rate: string) => `Barème ${rate}`,
    rateUnit: (rate: string) => `${rate} €/km`,
    noTripsYet: 'Pas encore de trajets sur ce mois',
    toDate: 'Cumul à ce jour',
    forecast: 'Prévu ce mois',
    gaugeAria: (actual: string, forecast: string) =>
      `${actual} km réalisés pour ${forecast} prévus`,
    journal: 'Journal des trajets',
    addTrip: '+ Ajouter un trajet',
    trip: {
      date: 'Date',
      route: 'Trajet',
      routePlaceholder: 'Domicile ⇄ client',
      reason: 'Motif',
      reasonPlaceholder: 'Mission client',
      km: 'Km',
      add: 'Ajouter',
      cancel: 'Annuler',
      remove: (route: string) => `Supprimer le trajet ${route}`,
      failed: 'Trajet non enregistré',
    },
    noTrips: 'Aucun trajet saisi pour ce mois.',
    total: 'Total des trajets',
  },
  editor: {
    open: 'Éditer le prévisionnel',
    enterActual: 'Saisir jours & TJM réels',
    forecastTitle: (period: string) => `Prévisionnel de ${period}`,
    actualTitle: (period: string) => `Réel de ${period}`,
    close: 'Fermer',
    tabsAria: 'Type de prévisionnel',
    tabs: {
      billing: 'Facturation',
      charges: 'Charges & BNC',
      salary: 'Salaire',
      mixedCosts: 'Frais mixtes',
      mileage: 'Frais km',
    },
    sourceAria: 'Source à modifier',
    source: { FORECAST: 'Prévu', ACTUAL: 'Réel' },
    applyNext: 'Appliquer aux mois suivants',
    appliedNext: 'Copié sur les mois suivants (modifiable mois par mois).',
    saved: 'Enregistré.',
    saveFailed: 'Enregistrement impossible',
    loadFailed: 'Impossible de charger le prévisionnel.',
    amounts: {
      category: 'Charge',
      forecast: 'Prévu (€ HT)',
      previousMonth: 'Mois précédent (réel)',
      lastYear: 'Même mois N-1',
      modified: 'modifié',
      resetLastYear: 'Revenir aux valeurs N-1',
      amountAria: (label: string) => `Montant prévu : ${label}`,
    },
    charges: {
      hint: "Un montant prévu par charge pour ce mois, et le BNC viré vers ton perso. Sans saisie, c'est le réel du même mois l'an dernier. « Appliquer aux mois suivants » copie le tout sur la fin de l'année.",
      total: (amount: string) => `Charges prévues ce mois : ${amount} HT`,
      remuneration: 'Rémunération',
      salaryNote: "Salaire brut : à régler dans l'onglet « Salaire ».",
      bnc: 'BNC prévu',
      bncHint: '€ virés vers ton perso (prélèvement sur le bénéfice)',
      mixedNote: "Frais mixtes : à régler dans l'onglet « Frais mixtes ».",
    },
    mixedCosts: {
      hint: "Tes dépenses perso (loyer, internet, téléphone, électricité) et la part que Stygma te rembourse. Pré-rempli avec tes dépenses perso du même mois l'an dernier : modifie ce que tu sais déjà (nouveau loyer, abonnement changé…).",
      category: 'Frais payé en perso',
      amount: 'Dépense perso (€)',
      key: 'Clé de répartition',
      share: 'Part Stygma',
      areaKey: (share: string) => `surface ${share} %`,
      ratioKey: (numerator: number, denominator: number) =>
        `clé ${numerator}/${denominator}`,
      total: (amount: string) => `Part Stygma prévue : ${amount}`,
    },
    salary: {
      hint: "Salaire brut que Stygma te verse ce mois. Sans saisie, c'est le brut du même mois l'an dernier. Les cotisations et le PAS s'en déduisent avec les taux de l'année (Réglages › Pro).",
      month: 'Mois',
      gross: 'Brut prévu (€)',
      lastYear: 'Même mois N-1',
      employer: (rate: string) => `Cotisations patronales (${rate} %)`,
      cost: 'Coût société',
      resetLastYear: 'Revenir au brut N-1',
    },
    mileage: {
      hint: 'Kilomètres professionnels prévus ce mois, à déclarer au barème kilométrique.',
      month: 'Mois',
      forecastKm: 'Km prévus',
      lastYear: 'Même mois N-1',
      toDeclare: 'À déclarer',
      note: (rate: string) =>
        `Pré-rempli avec les km du même mois l'an dernier. Barème : ${rate} (Réglages › Pro, par année). Les trajets réels s'ajoutent ensuite via « Ajouter un trajet ».`,
      resetLastYear: 'Revenir à N-1',
    },
    billing: {
      hintForecast:
        'Une ligne par client : TJM potentiel (HT) × jours. Plusieurs clients possibles dans le mois.',
      hintActual:
        'Jours et TJM réellement facturés, à saisir à la main : ils ne figurent pas sur le relevé. Les encaissements, eux, viennent du relevé pro (catégorie « Encaissement client »).',
      client: 'Client',
      clientPlaceholder: 'Nom du client',
      dailyRate: 'TJM (€ HT)',
      days: 'Jours',
      total: 'Total HT',
      remove: 'Supprimer cette ligne',
      add: '+ Ajouter un client',
      totalForecast: (amount: string, days: string) =>
        `Total prévu : ${amount} HT · ${days} j`,
      totalActual: (amount: string, days: string) =>
        `Total réel : ${amount} HT · ${days} j`,
    },
  },
  year: {
    kpis: {
      revenue: 'CA HT final (réel + prévu restant)',
      revenueTip:
        "CA HT final = réel encaissé à ce jour + prévisionnel des mois restants. Les mois passés comptent le réel (ou le prévu s'il n'y a pas encore de réel), les mois futurs comptent le prévu.",
      revenueSub: (actual: string, forecast: string) =>
        `Réel à ce jour ${actual} · prévu d'origine ${forecast}`,
      profit: 'Bénéfice final',
      profitTip:
        "Bénéfice = CA HT − charges pro − salaires bruts − cotisations patronales, cumulé sur l'année. « Final » = réel des mois passés + prévisionnel des mois à venir. Avant IR des associés.",
      profitSub: 'Avant IR des associés',
      vat: 'TVA à reverser (réel + prévu)',
      vatTip:
        "TVA cumulée à reverser sur l'année : réel des mois importés + prévisionnel des mois restants. Rappel : la TVA d'un mois se déclare le mois suivant.",
      vatSub: (from: string, to: string) => `réel ${from} → ${to}`,
      vatForecast: 'Prévisionnel — pas encore de réel',
      noActual: 'Pas encore de réel',
      mileage: 'Frais km à déclarer',
      mileageTip:
        "Total des frais kilométriques à déclarer sur l'année (km × barème). Montant à déclarer, pas une transaction bancaire. Le solde des frais mixtes encore dus par Stygma est indiqué en dessous.",
      mileageSub: (km: string, left: string) =>
        `${km} km sur l'année · frais mixtes restant dus : ${left}`,
    },
    categories: {
      title: "Catégories · prévu vs réel sur l'année",
      tip: "Cumul de chaque poste sur les mois ayant un réel importé. Prévu = somme des prévus de toute l'année. Réel = somme des réels des mois importés. Écart = réel − prévu (vert si favorable, rouge si défavorable).",
      subtitle: (from: string, to: string) =>
        `Prévu et réel cumulés sur les mois avec réel (${from} → ${to})`,
      noActual:
        "Pas encore de mois avec réel : seul le prévu de l'année est affiché.",
      yearForecast: (amount: string) => `prévu année ${amount}`,
    },
    mixedCosts: {
      title: 'Frais mixtes · année',
      description:
        'Loyer, internet, téléphone, énergie · cumul des mois avec réel. Idéal pour un remboursement groupé.',
      yearForecast: (amount: string) => `Prévu année : ${amount}`,
      spent: (amount: string) => `Payé en perso : ${amount}`,
      due: (amount: string) => `Dû : ${amount}`,
      paid: (paid: string, left: string) =>
        `${paid} remboursé · reste réel ${left}`,
      leftForecast: (amount: string) => `Reste prévisionnel : ${amount}`,
      left: 'Reste à rembourser (année)',
    },
    mileage: {
      title: 'Frais kilométriques · année',
      toDate: 'À ce jour',
      yearForecast: 'Prévu année',
      barsAria: 'Kilomètres par mois',
      bar: (month: string, km: string) => `${month} : ${km} km`,
    },
    statement: {
      title: 'Compte de résultat simplifié',
      tip: "Tableau récapitulatif de l'année : une colonne par mois + une colonne « Total ». Mois passés = réel (valeurs normales), mois à venir = prévisionnel (italique estompé). « Total » = réel des mois passés + prévisionnel des mois restants.",
      subtitle:
        'en € HT · mois à venir = prévisionnel (italique) · « Total » = réel + prévisionnel restant',
      line: 'Poste',
      final: 'Total',
      rows: {
        forecastRevenue: "CA HT · prévu d'origine",
        revenue: 'CA HT · final',
        charges: 'Charges pro',
        grossSalary: 'Salaires bruts',
        employerContributions: 'Cotisations patronales',
        socialCharges: 'Charges sociales sur bénéfice',
        profit: 'Bénéfice',
        bnc: 'Revenus BNC prélevés',
        vat: 'TVA à reverser',
        mileage: 'Frais km à déclarer',
      },
      rowTips: {
        forecastRevenue:
          "CA HT prévu au moment de la saisie du prévisionnel. Sert de référence fixe pour mesurer l'écart avec le réel.",
        revenue:
          "CA HT final = réel des mois passés + prévisionnel des mois à venir. C'est le chiffre d'affaires hors taxes, avant TVA.",
        charges:
          'Total des charges pro (hors salaires, cotisations et TVA) : RC Pro, comptable, logiciels, frais bancaires, matériel, restauration, déplacements, frais mixtes remboursés.',
        grossSalary:
          "Salaire brut que Stygma te verse en tant que président. C'est une charge de la société (avant retenues salariales et prélèvement à la source).",
        employerContributions:
          'Part employeur des cotisations sociales, en plus du salaire brut. Réparties entre URSSAF, retraite complémentaire, complémentaire santé et prévoyance.',
        socialCharges:
          'Taux × bénéfice (Réglages › Pro). Base = ta quote-part du bénéfice, retirée ou non. À mettre de côté : se règle en perso.',
        profit:
          "CA HT − charges pro − salaires bruts − cotisations patronales. C'est ce sur quoi tu es imposé (quote-part de bénéfice).",
        bnc: 'Virements de Stygma vers ton compte perso (catégorie « BNC »). Prélèvement sur le bénéfice, pas une charge : ne change pas le bénéfice, seulement la trésorerie.',
        vat: "TVA collectée − TVA déductible. Pour des prestations de services, exigible à l'encaissement (pas à la facturation). Se déclare le mois suivant.",
        mileage:
          'Kilomètres × barème kilométrique (Réglages › Pro). Montant à déclarer, pas une transaction bancaire.',
      },
    },
    chart: {
      title: 'CA HT · réel et prévisionnel',
      actual: 'Réel',
      forecastLeft: 'Prévisionnel restant',
      originalForecast: "Prévu d'origine",
      charges: 'Charges pro',
      aria: (year: number) =>
        `Histogramme du CA HT réel et prévisionnel par mois, de janvier à décembre ${year}`,
      bar: (
        month: string,
        revenue: string,
        forecast: string,
        charges: string,
      ) => `${month} : CA ${revenue} (prévu ${forecast}), charges ${charges}`,
    },
  },
  revenue: {
    title: 'CA HT',
    tip: "Total des prestations du mois, hors TVA : jours × TJM de chaque client (voir Facturation). Rattaché au mois de la prestation, pas à celui de l'encaissement.",
    gaugeAria: (real: string, forecast: string) =>
      `CA HT : ${real} pour ${forecast} prévus`,
    invoiced: 'Facturé',
    invoicedSub: (count: number) => `HT · ${plural(count, 'facture')}`,
    toInvoice: 'À facturer',
    collected: 'Encaissé',
    collectedSub: 'TTC reçu ce mois',
    remaining: 'Reste à encaisser',
    remainingSub: 'TTC, cumul',
    toInvoiceTtc: 'À facturer TTC',
    days: 'Jours facturés',
    ht: 'HT',
    forecastTtc: 'TTC prévu',
    nothingBeforeEnd: 'rien avant la fin du mois',
  },
} as const

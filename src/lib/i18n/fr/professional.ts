import { plural } from "@/lib/i18n/plural";

/** Dashboard Pro (Stygma SAS). Montants et nombres arrivent déjà formatés. */
export const professional = {
  company: "Stygma SAS",
  title: "Pro",
  eyebrow: (period: string) => `${period} · Stygma SAS`,
  loadFailed: "Impossible de charger le dashboard pro.",
  loadPeriodFailed: "Impossible de charger la période.",
  futureMonth:
    "Mois à venir : seul le prévisionnel existe. Le réel se remplira à l'import des relevés et à la saisie des jours facturés.",
  transactionsLink: (count: number) => `Transactions (${count})`,
  importStatement: "Importer un relevé pro",
  futureTransactions: "Mois à venir : les transactions apparaîtront après l'import du relevé.",
  forecastLabel: "Prévisionnel",
  forecastValue: (amount: string) => `Prévu ${amount}`,
  howComputed: (name: string) => `Comment est calculé « ${name} » ?`,
  days: (days: string) => `${days} j`,
  forecastSub: (amount: string) => `prévu ${amount}`,
  forecastOnly: "prévisionnel",
  vat: {
    title: "TVA à reverser",
    tip: "TVA à reverser = TVA collectée − TVA déductible, calculée sur le CA et les charges du mois. En réel, pour des prestations de services, la TVA est exigible à l'encaissement (sauf option pour les débits) : une facture de décembre payée en janvier se déclare en janvier.",
    collected: "TVA collectée (20 % du CA)",
    collectedTip:
      "Collectée = 20 % × CA HT. C'est la TVA facturée à tes clients : elle ne t'appartient pas, elle est reversée à l'État.",
    deductible: "− TVA déductible (charges)",
    deductibleTip:
      "Déductible = TVA payée sur tes charges, au taux de chaque catégorie (20 %, 10 % ou 0 % selon la dépense). Elle vient en déduction de la TVA collectée.",
    due: "= À reverser",
    dueTip:
      "Collectée − déductible. Le paiement à l'État apparaît ensuite dans le relevé en catégorie « TVA », le mois suivant.",
  },
  profit: {
    title: "Bénéfice",
    tip: "Bénéfice = CA HT − charges pro − salaires bruts − cotisations patronales. Les virements BNC vers ton perso ne sont pas une charge : ils ne changent pas le bénéfice.",
    splitAria: "Répartition du CA HT : charges, salaires, cotisations patronales, bénéfice",
    revenue: "CA HT",
    revenueTip: "Chiffre d'affaires hors taxes du mois : ce que tu factures, avant TVA.",
    charges: "Charges pro",
    chargesTip:
      "Charges de la société du mois, en HT : RC Pro, comptable, logiciels, frais bancaires, matériel, restauration, déplacements, frais mixtes remboursés… Hors salaires, cotisations et TVA.",
    salary: "Salaires bruts",
    salaryTip:
      "Salaire que Stygma te verse en tant que président, avant retenues (cotisations salariales et prélèvement à la source). C'est une charge de la société.",
    employer: "Cotisations patronales",
    employerTip:
      "Part employeur des cotisations sociales, en plus du salaire brut : salaire brut × taux patronal (Réglages › Pro). Réparties entre URSSAF, retraite complémentaire, complémentaire santé et prévoyance : détail dans le tableau par catégorie.",
    profitTip:
      "Ce qui reste du CA HT une fois payés les charges pro, les salaires bruts et les cotisations patronales. C'est ce sur quoi tu es imposé (quote-part de bénéfice), que tu le retires ou non.",
    bnc: "Revenus BNC prélevés",
    bncTip:
      "Ce que Stygma te vire sur ton compte perso (virements « bnc » du relevé pro). C'est un prélèvement sur le bénéfice, pas une charge : il ne baisse que la trésorerie de la société.",
    retained: "Reste en trésorerie",
    retainedTip:
      "Bénéfice − BNC prélevés : la part du bénéfice qui reste dans la société. Hors TVA et factures non encaissées.",
    socialCharges: "Charges sociales sur bénéfice",
    socialChargesTip:
      "Taux × bénéfice (Réglages › Pro). La base est ta quote-part du bénéfice, retirée ou non. Se règle en perso : à mettre de côté. Taux à confirmer avec ton comptable. Bénéfice négatif = 0.",
    socialChargesSub: (rate: string) => `${rate} % du bénéfice`,
  },
  revenue: {
    title: "CA HT",
    tip: "Total des prestations du mois, hors TVA : jours × TJM de chaque client (voir Facturation). Rattaché au mois de la prestation, pas à celui de l'encaissement.",
    gaugeAria: (real: string, forecast: string) => `CA HT : ${real} pour ${forecast} prévus`,
    invoiced: "Facturé",
    invoicedSub: (count: number) => `HT · ${plural(count, "facture")}`,
    toInvoice: "À facturer",
    collected: "Encaissé",
    remaining: "Reste à encaisser",
    days: "Jours facturés",
    ht: "HT",
    ttc: "TTC",
    forecastTtc: "TTC prévu",
    nothingBeforeEnd: "rien avant la fin du mois",
  },
} as const;

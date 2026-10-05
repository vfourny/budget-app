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

import { plural } from "@/lib/i18n/plural";

/** Tableau « Transactions du mois », partagé par les dashboards Perso et Pro. */
export const transactions = {
  title: "Transactions du mois",
  /** Montants déjà formatés (positifs). */
  summary: (count: number, credits: string, debits: string) =>
    `${plural(count, "transaction")} · crédits + ${credits} · débits − ${debits}`,
  filtersAria: "Filtrer les transactions",
  filters: {
    all: (count: number) => `Toutes (${count})`,
    credits: (count: number) => `Crédits (${count})`,
    debits: (count: number) => `Débits (${count})`,
    toCheck: (count: number) => `À vérifier (${count})`,
  },
  toCheck: "À vérifier",
  apartment: "Appartement",
  empty: "Aucune transaction pour ce mois.",
  emptyFilter: "Aucune transaction pour ce filtre.",
} as const;

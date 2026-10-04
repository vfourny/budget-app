import { plural } from "@/lib/i18n/plural";

/** Écran d'accueil. */
export const home = {
  eyebrow: "Vue d'ensemble",
  greeting: "Bonjour",
  noValidatedImport: "Aucun import validé pour le moment.",
  professionalTitle: "Stygma SAS",
  professionalSoon: "Le suivi pro (CA, résultat, TVA) arrivera après le MVP perso.",
  toCheckTitle: "À vérifier",
  loadImportsFailed: "Impossible de charger les imports.",
  nothingToCheck: "Rien à vérifier : tous tes imports sont validés.",
  readyToValidate: "Import prêt à valider",
  transactionsToCheck: (count: number) => `${plural(count, "transaction")} à vérifier`,
  importedOn: (date: string, fileName: string) => `Import du ${date} · ${fileName}`,
  review: "Relire",
} as const;

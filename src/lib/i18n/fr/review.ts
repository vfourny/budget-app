import { plural } from "@/lib/i18n/plural";

/** Écran de relecture d'un import. */
export const review = {
  back: "Retour aux imports",
  title: "Relecture",
  eyebrow: (date: string, account: string) => `Import du ${date} · ${account}`,
  loadFailed: "Impossible de charger cet import.",
  confidentTile: "catégorisées avec confiance",
  toReviewTile: "à vérifier",
  filterAll: (count: number) => `Toutes · ${count}`,
  filterToReview: (count: number) => `À vérifier · ${count}`,
  columns: { confidence: "Confiance", apartment: "Appartement" },
  apartmentOf: (label: string) => `Appartement de ${label}`,
  apartmentPlaceholder: "Choisir…",
  loanMatch: {
    recognized: "Échéance du prêt reconnue",
    notRecognized: (expected: string) => `Échéance du prêt non reconnue : attendu ${expected}`,
  },
  categoryOf: (label: string) => `Catégorie de ${label}`,
  categoryPlaceholder: "Choisir…",
  correctionFailed: "La correction n'a pas été enregistrée.",
  actionFailed: "Action impossible",
  lockedNote: "Import validé : ses lignes comptent dans les dashboards.",
  toReviewNote: (count: number) =>
    `Confirme ou corrige la catégorie ${
      count === 1 ? "de la transaction surlignée" : `des ${count} transactions surlignées`
    } avant de valider l'import.`,
  doneNote: "Tes corrections serviront d'exemples pour les prochaines catégorisations.",
  categorizeWithAi: "Catégoriser avec l'IA",
  validateTooltip: (count: number) =>
    `Encore ${plural(count, "transaction")} à confirmer ou catégoriser`,
  validate: (count: number) => `Valider ${plural(count, "transaction")}`,
  // Pastilles de confiance
  toCategorize: "À catégoriser",
  confirmed: "Confirmée",
} as const;

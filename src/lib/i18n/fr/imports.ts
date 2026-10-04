import { plural, pluralize } from "@/lib/i18n/plural";

/** Historique des imports, formulaire d'import et suppression. */
export const imports = {
  eyebrow: "Historique des fichiers",
  title: "Imports",
  newImport: "Nouvel import",
  count: (count: number) => plural(count, "import"),
  deleteHint: "Supprimer un import retire aussi ses lignes des vues Perso / Pro",
  empty: "Aucun import pour le moment.",
  loadFailed: "Impossible de charger les imports.",
  columns: {
    file: "Fichier",
    account: "Compte",
    importedOn: "Importé le",
    lines: "Lignes",
    status: "Statut",
  },
  /** Badge d'un import en attente qui a encore des lignes à vérifier. */
  toReview: (count: number) => `${count} à vérifier`,
  // Suppression (deux temps : bouton, puis confirmation)
  deleteImport: "Supprimer l'import",
  cancelImport: "Annuler l'import",
  confirmDelete: (lineCount: number) => `Supprimer ${plural(lineCount, "ligne")} ?`,
} as const;

/** Page « Importer un relevé ». */
export const importForm = {
  eyebrow: "Nouvel import",
  title: "Importer un relevé",
  fileTitle: "Fichier",
  dropzoneAria: "Choisir le relevé CSV",
  dropHere: "Dépose ton relevé CSV ici",
  orClickToChoose: "ou clique pour le choisir",
  clickToChange: "clique pour changer",
  fileSize: (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} Ko`,
  notACsv: "Ce fichier n'est pas un CSV.",
  accountType: "Type de compte",
  accountTypePlaceholder: "Perso ou pro…",
  submit: "Importer",
  resultTitle: "Résultat",
  importFailed: "Import impossible",
  hint: "Choisis le type de compte et un relevé CSV : les transactions sont importées puis catégorisées automatiquement, avant ta relecture.",
  /** « transaction(s) importée(s) », affiché sous le grand nombre. */
  importedLabel: (count: number) =>
    pluralize(count, "transaction importée", "transactions importées"),
  duplicateTitle: (count: number) => plural(count, "ligne déjà importée", "lignes déjà importées"),
  duplicateBody: "Ces lignes figuraient dans un import précédent : elles ne sont pas dupliquées.",
  categorizationFailedTitle: "Catégorisation automatique impossible",
  categorizationFailedBody: (reason: string) =>
    `${reason} Les lignes sont importées : tu peux les catégoriser à la main.`,
  ignoredTitle: (count: number) => plural(count, "ligne ignorée", "lignes ignorées"),
  lineError: (line: number, reason: string) => `Ligne ${line} : ${reason}`,
  reviewImport: "Relire l'import",
} as const;

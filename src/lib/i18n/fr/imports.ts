import { plural, pluralize } from "@/lib/i18n/plural";
import type { DetectionCheckCode } from "@server/lib/csv/detect-format";
import type { CsvFormatConfig } from "@shared/csv-format";

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
  // Format de CSV inconnu : détection par l'IA, puis confirmation avant import
  detecting: "Format de fichier inconnu : analyse du fichier par l'IA…",
  detectionFailedTitle: "Détection du format impossible",
  retryDetection: "Relancer la détection",
  formatTitle: "Nouveau format détecté",
  formatIntro:
    "Vérifie que les colonnes sont les bonnes avant d'importer. Ce format sera mémorisé : les prochains fichiers de cette banque s'importeront directement.",
  formatName: "Nom du format",
  formatNameDescription: "Pour t'y retrouver, par exemple le nom de la banque.",
  defaultFormatName: "Format personnalisé",
  confirmFormat: "Confirmer et importer",
  columnN: (n: number) => `Colonne ${n}`,
  mappingFields: {
    date: "Date",
    label: "Libellé",
    amount: "Montant",
    decimal: "Séparateur décimal",
  },
  mappingDate: (column: string, format: string) => `${column} (${format})`,
  mappingJoin: " + ",
  mappingDebitCredit: (debit: string, credit: string) => `Débit : ${debit} · Crédit : ${credit}`,
  dateFormats: {
    "yyyy-mm-dd": "aaaa-mm-jj",
    "dd/mm/yyyy": "jj/mm/aaaa",
  } as const satisfies Record<CsvFormatConfig["dateFormat"], string>,
  decimalSeparatorNames: {
    ",": "virgule",
    ".": "point",
  } as const satisfies Record<CsvFormatConfig["decimalSeparator"], string>,
  previewTitle: (count: number) => `Aperçu : ${plural(count, "ligne lue", "lignes lues")}`,
  previewColumns: { date: "Date", label: "Libellé", amount: "Montant" },
  formatChecks: {
    NO_TRANSACTIONS: "Aucune ligne n'a pu être lue avec ce format : il ne peut pas être utilisé.",
    UNREADABLE_LINES:
      "Certaines lignes sont illisibles avec ce format (date ou montant invalide) : vérifie les colonnes.",
    DATES_OUT_OF_RANGE:
      "Des dates paraissent aberrantes (avant 2000 ou dans le futur) : la colonne de date est peut-être la mauvaise.",
    EMPTY_LABELS: "Des libellés sont vides : la colonne de libellé est peut-être la mauvaise.",
  } as const satisfies Record<DetectionCheckCode, string>,
} as const;

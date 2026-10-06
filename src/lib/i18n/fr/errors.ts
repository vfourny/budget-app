import type { AppErrorCode, AppErrorParams } from "@server/lib/app-error";
import type { CsvLineErrorCode } from "@server/lib/csv/types";

import { plural } from "@/lib/i18n/plural";

/** Une traduction : un texte, ou une fonction si le code porte des paramètres (`AppErrorParams`). */
type ErrorMessages = {
  [Code in AppErrorCode]: Code extends keyof AppErrorParams
    ? (params: AppErrorParams[Code]) => string
    : string;
};

/**
 * Erreurs métier du serveur (codes de `server/lib/app-error.ts`) + deux cas gérés côté front.
 * `satisfies` : `tsc` échoue si un code serveur n'a pas de traduction.
 */
export const errors = {
  NOT_AUTHENTICATED: "Session expirée : reconnecte-toi.",
  IMPORT_NOT_FOUND: "Import introuvable.",
  IMPORT_ALREADY_VALIDATED: "Cet import est déjà validé.",
  TRANSACTION_NOT_FOUND: "Transaction introuvable.",
  TRIP_NOT_FOUND: "Trajet introuvable.",
  CATEGORY_NOT_ALLOWED: "Cette catégorie n'existe pas pour ce type de compte (perso / pro).",
  UNKNOWN_CSV_FORMAT:
    "Format de fichier inconnu : aucun format enregistré ne correspond à l'en-tête de ce CSV.",
  NO_READABLE_TRANSACTIONS:
    "Aucune transaction lisible dans ce fichier : format de banque incorrect ?",
  ALL_ROWS_ALREADY_IMPORTED: "Toutes les lignes de ce relevé sont déjà importées.",
  REMAINING_TO_REVIEW: ({ remaining }) =>
    `Encore ${plural(remaining, "transaction")} à catégoriser avant de valider.`,
  GEMINI_QUOTA_EXCEEDED:
    "Quota Gemini atteint : réessaie dans une minute (ou demain si le quota du jour est épuisé).",
  GEMINI_REFUSED:
    "Gemini a refusé la requête : clé API invalide ou modèle indisponible pour ce compte.",
  CATEGORIZATION_FAILED: "La catégorisation par l'IA a échoué, réessaie dans un instant.",
  CSV_FORMAT_DETECTION_FAILED:
    "La détection du format du fichier par l'IA a échoué, réessaie dans un instant.",
  // Pas des codes serveur : validation Zod rejetée, ou erreur réseau / inattendue.
  INVALID_INPUT: "Données invalides.",
  UNKNOWN: "Une erreur est survenue.",
} as const satisfies ErrorMessages & Record<"INVALID_INPUT" | "UNKNOWN", string>;

/** Raison pour laquelle une ligne de relevé CSV a été écartée (`value` = valeur fautive). */
export const csvErrors = {
  INVALID_AMOUNT: (value) => `Montant invalide : « ${value} »`,
  INVALID_DATE: (value) => `Date invalide : « ${value} »`,
  MISSING_AMOUNT: () => "Montant manquant",
  EMPTY_DEBIT_CREDIT: () => "Débit et crédit vides",
  UNKNOWN: () => "Erreur inconnue",
} as const satisfies Record<CsvLineErrorCode, (value: string) => string>;

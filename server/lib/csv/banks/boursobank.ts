import type { BankCsvConfig } from "@server/lib/csv/types";

// Export BoursoBank (Mouvements > Télécharger, format CSV). L'en-tête a la colonne "Solde" en
// double (bug d'export connu côté BoursoBank) : la 1ʳᵉ occurrence (colonne 6) est en fait le
// montant de l'opération, la 2ᵉ (colonne 10) le vrai solde courant. On mappe donc par index de
// colonne plutôt que par nom d'en-tête.
export const boursobankConfig = {
  bank: "BoursoBank",
  delimiter: ";",
  hasHeader: true,
  dateFormat: "yyyy-mm-dd",
  decimalSeparator: ",",
  columns: {
    date: 0, // Date Opération
    label: 2, // Libellé brut — plus riche que "Libellé Suggéré" pour la catégorisation
    amount: { kind: "signed", column: 6 },
  },
} as const satisfies BankCsvConfig;

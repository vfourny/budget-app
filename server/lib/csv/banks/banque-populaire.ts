import type { BankCsvConfig } from "@server/lib/csv/types";

// Export Banque Populaire (compte pro Stygma) : "Relevé de compte" au format CSV. Débit et
// crédit sont deux colonnes séparées, déjà signées dans l'export (ex. "-115,00" / "+8640,00").
export const banquePopulaireConfig = {
  bank: "Banque Populaire",
  delimiter: ";",
  hasHeader: true,
  dateFormat: "dd/mm/yyyy",
  decimalSeparator: ",",
  columns: {
    date: 0, // Date comptable
    // Libellé simplifié + informations complémentaires (référence facture, tiers…) : plus
    // riche pour la catégorisation automatique qu'un des deux champs seul.
    label: (fields) => (fields[3] ? `${fields[1]} — ${fields[3]}` : fields[1]),
    amount: { kind: "debitCredit", debit: 5, credit: 6 },
  },
} as const satisfies BankCsvConfig;

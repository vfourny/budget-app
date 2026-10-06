import { db } from "@server/lib/db";
import { csvFingerprint } from "@server/lib/csv/fingerprint";
import type { CsvFormatConfig } from "@shared/csv-format";

// Les deux formats d'export historiques (validés sur de vrais relevés). Un nouveau format n'a plus
// besoin d'être ajouté ici : il est détecté à l'import puis enregistré en base.
const FORMATS = [
  {
    name: "BoursoBank",
    // En-tête exact de l'export. La colonne « Solde » y est en double (bug BoursoBank) : la 1re
    // occurrence (colonne 6) est le montant de l'opération, la 2e (colonne 10) le solde courant.
    header:
      '"Date Opération";"Date Valeur";Libellé;"Libellé Suggéré";Catégorie;"Catégorie Parente";Solde;Commentaire;"Numéro Compte";"Libellé Compte";Solde;Pointage',
    config: {
      delimiter: ";",
      hasHeader: true,
      dateFormat: "yyyy-mm-dd",
      decimalSeparator: ",",
      dateColumn: 0, // Date Opération
      labelColumns: [2], // Libellé brut, plus riche que « Libellé Suggéré » pour la catégorisation
      amount: { kind: "signed", column: 6 },
    },
  },
  {
    name: "Banque Populaire",
    header:
      "Date comptable;Libelle simplifie;Reference;Informations complementaires;Type operation;Debit;Credit;Date operation;Date de valeur;Pointage",
    config: {
      delimiter: ";",
      hasHeader: true,
      dateFormat: "dd/mm/yyyy",
      decimalSeparator: ",",
      dateColumn: 0, // Date comptable
      labelColumns: [1, 3], // Libellé simplifié + informations complémentaires (référence, tiers…)
      // Débit et crédit : deux colonnes déjà signées, une seule renseignée par ligne.
      amount: { kind: "debitCredit", debit: 5, credit: 6 },
    },
  },
] as const satisfies readonly { name: string; header: string; config: CsvFormatConfig }[];

/** Enregistre les formats historiques pour l'utilisateur. Idempotent, et n'écrase pas un format
 * déjà corrigé depuis l'app (`update` vide). À relancer sur chaque base (develop et production). */
export async function seedCsvFormats(userId: string): Promise<void> {
  for (const { name, header, config } of FORMATS) {
    await db.csvFormat.upsert({
      where: { userId_fingerprint: { userId, fingerprint: csvFingerprint(header) } },
      create: { userId, fingerprint: csvFingerprint(header), name, config },
      update: {},
    });
  }
  process.stdout.write(`Formats CSV : ${FORMATS.length} vérifiés` + "\n");
}

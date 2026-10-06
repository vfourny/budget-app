import { csvFingerprint } from "@server/lib/csv/fingerprint";
import type { db } from "@server/lib/db";
import { csvFormatConfigSchema, type CsvFormatConfig } from "@shared/csv-format";

/** Format de colonnes connu pour ce fichier (même empreinte d'en-tête que pour un import
 * précédent), ou `null` si c'est un format inédit. Un format dont le JSON ne passe plus le schéma
 * Zod (schéma modifié depuis) est traité comme inconnu plutôt que de planter l'import. */
export async function findCsvFormat(
  userId: string,
  csvText: string,
  client: Pick<typeof db, "csvFormat">,
): Promise<CsvFormatConfig | null> {
  const format = await client.csvFormat.findUnique({
    where: { userId_fingerprint: { userId, fingerprint: csvFingerprint(csvText) } },
    select: { config: true },
  });
  if (!format) return null;

  const parsed = csvFormatConfigSchema.safeParse(format.config);
  return parsed.success ? parsed.data : null;
}

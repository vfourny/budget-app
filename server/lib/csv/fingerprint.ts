import { createHash } from "node:crypto";

/** Empreinte du format d'un fichier CSV : SHA-256 de sa 1re ligne (l'en-tête), sans BOM UTF-8 ni
 * espaces autour. Deux exports de la même banque ont le même en-tête, donc la même empreinte ;
 * c'est la clé de `CsvFormat` (un format connu = pas besoin de le redétecter). */
export function csvFingerprint(csvText: string): string {
  const firstLine = csvText.replace(/^﻿/, "").split(/\r?\n/, 1)[0].trim();
  return createHash("sha256").update(firstLine).digest("hex");
}

import type { BankCsvConfig } from "@server/lib/csv/types";
import { banquePopulaireConfig } from "@server/lib/csv/banks/banque-populaire";
import { boursobankConfig } from "@server/lib/csv/banks/boursobank";

/** Un mapping de colonnes par banque supportée, indexé par `BankAccount.bank`. Ajouter une banque
 * = ajouter une entrée ici (et son fichier de config), sans toucher au parseur générique. */
export const BANK_CSV_CONFIGS = {
  [boursobankConfig.bank]: boursobankConfig,
  [banquePopulaireConfig.bank]: banquePopulaireConfig,
} as const satisfies Record<string, BankCsvConfig>;

/** Noms de banque supportés (`"BoursoBank" | "Banque Populaire"`), dérivés des clés ci-dessus. */
export type SupportedBank = keyof typeof BANK_CSV_CONFIGS;

/** `bank` vient de la base (`BankAccount.bank`, un `string`) : on garde donc un paramètre large
 * et on affine avec `Object.hasOwn` (évite aussi les clés héritées type `"toString"`). */
export function getBankCsvConfig(bank: string): BankCsvConfig | undefined {
  return Object.hasOwn(BANK_CSV_CONFIGS, bank)
    ? BANK_CSV_CONFIGS[bank as SupportedBank]
    : undefined;
}

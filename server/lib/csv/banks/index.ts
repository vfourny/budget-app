import type { BankCsvConfig } from "@server/lib/csv/types";
import { banquePopulaireConfig } from "@server/lib/csv/banks/banque-populaire";
import { boursobankConfig } from "@server/lib/csv/banks/boursobank";

/** Un mapping de colonnes par banque supportée, indexé par `Account.bank`. Ajouter une banque
 * = ajouter une entrée ici (et son fichier de config), sans toucher au parseur générique. */
export const BANK_CSV_CONFIGS: Record<string, BankCsvConfig> = {
  [boursobankConfig.bank]: boursobankConfig,
  [banquePopulaireConfig.bank]: banquePopulaireConfig,
};

export function getBankCsvConfig(bank: string): BankCsvConfig | undefined {
  return BANK_CSV_CONFIGS[bank];
}

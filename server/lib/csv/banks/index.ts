import type { AccountType } from "@server/generated/prisma/enums";
import type { BankCsvConfig } from "@server/lib/csv/types";
import { banquePopulaireConfig } from "@server/lib/csv/banks/banque-populaire";
import { boursobankConfig } from "@server/lib/csv/banks/boursobank";

/** Un mapping de colonnes par banque supportée, indexé par `BankCsvConfig.bank`. Ajouter une banque
 * = ajouter une entrée ici (et son fichier de config), sans toucher au parseur générique. */
const BANK_CSV_CONFIGS = {
  [boursobankConfig.bank]: boursobankConfig,
  [banquePopulaireConfig.bank]: banquePopulaireConfig,
} as const satisfies Record<string, BankCsvConfig>;

/** Noms de banque supportés (`"BoursoBank" | "Banque Populaire"`), dérivés des clés ci-dessus. */
type SupportedBank = keyof typeof BANK_CSV_CONFIGS;

/** Banque (donc format CSV) de chaque type de compte. La banque n'est pas stockée en base : elle ne
 * sert qu'à choisir le parseur à l'import. `satisfies` impose une entrée par `AccountType`. */
const BANK_BY_ACCOUNT_TYPE = {
  PERSONAL: "BoursoBank",
  PROFESSIONAL: "Banque Populaire",
} as const satisfies Record<AccountType, SupportedBank>;

/** Mapping CSV à utiliser pour un type de compte. */
export function getBankCsvConfig(accountType: AccountType): BankCsvConfig {
  return BANK_CSV_CONFIGS[BANK_BY_ACCOUNT_TYPE[accountType]];
}

import type { CompanyRegime } from "@server/generated/prisma/enums";
import { sasIrRegime } from "@server/lib/pro/regimes/sas-ir";
import type { ProRegime } from "@server/lib/pro/regimes/types";

/** Statuts calculés (voir `SUPPORTED_REGIMES` dans `shared/pro-rules.ts`). */
const REGIMES: Partial<Record<CompanyRegime, ProRegime>> = { SAS_IR: sasIrRegime };

/** Règles du statut ; un statut pas encore géré retombe sur la SAS à l'IR. */
export function regimeOf(regime: CompanyRegime): ProRegime {
  return REGIMES[regime] ?? sasIrRegime;
}

import type { CompanyRegime } from "@server/generated/prisma/enums";
import { sasIrRegime } from "@server/lib/professional/regimes/sas-ir";
import type { ProfessionalRegime } from "@server/lib/professional/regimes/types";

/** Statuts calculés (voir `SUPPORTED_REGIMES` dans `shared/professional-rules.ts`). */
const REGIMES: Partial<Record<CompanyRegime, ProfessionalRegime>> = { SAS_IR: sasIrRegime };

/** Règles du statut ; un statut pas encore géré retombe sur la SAS à l'IR. */
export function regimeOf(regime: CompanyRegime): ProfessionalRegime {
  return REGIMES[regime] ?? sasIrRegime;
}

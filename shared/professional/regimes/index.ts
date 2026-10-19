import type { CompanyRegime } from '@server/generated/prisma/enums'
import type { ProfessionalRegime } from '@shared/professional/regimes/regime.type'
import { sasIrRegime } from '@shared/professional/regimes/sas-ir.regime'

/** Statuts calculés (voir `SUPPORTED_REGIMES` dans `shared/professional/professional.rules.ts`). */
const REGIMES: Partial<Record<CompanyRegime, ProfessionalRegime>> = {
  SAS_IR: sasIrRegime,
}

/** Règles du statut ; un statut pas encore géré retombe sur la SAS à l'IR. */
export function regimeOf(regime: CompanyRegime): ProfessionalRegime {
  return REGIMES[regime] ?? sasIrRegime
}

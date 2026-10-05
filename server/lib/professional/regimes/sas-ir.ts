import { applyBp } from "@server/lib/professional/amounts";
import type { ProfessionalRegime } from "@server/lib/professional/regimes/types";

/**
 * SAS à l'IR : le président est assimilé salarié (salaire brut fixe, cotisations patronales et
 * salariales au taux du bulletin), et le bénéfice est imposé chez l'associé, qui paie en plus des
 * charges sociales sur sa quote-part (retirée ou non).
 */
export const sasIrRegime: ProfessionalRegime = {
  remuneration(settings) {
    const gross = settings.grossSalaryCents;
    return {
      grossSalaryCents: gross,
      employerContributionsCents: applyBp(gross, settings.employerContributionBp),
      employeeContributionsCents: applyBp(gross, settings.employeeContributionBp),
      withholdingTaxCents: applyBp(
        applyBp(gross, settings.taxableNetBp),
        settings.withholdingTaxBp,
      ),
    };
  },
  profitSocialCharges(profitCents, settings) {
    return applyBp(Math.max(0, profitCents), settings.profitSocialChargesBp);
  },
};

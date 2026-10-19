import type { ProfessionalYearSettingsValues } from '@shared/professional/rules'

/** Rémunération mensuelle du dirigeant selon le régime, en centimes. */
interface Remuneration {
  /** Retenues sur le brut (pas un coût en plus pour la société). */
  employeeContributionsCents: number
  /** Part employeur : une charge de la société. */
  employerContributionsCents: number
  grossSalaryCents: number
  /** Prélèvement à la source sur le salaire. */
  withholdingTaxCents: number
}

/**
 * Règles propres à un statut juridique / fiscal. Ajouter un statut (SAS à l'IS, EURL…) = écrire un
 * nouveau `ProfessionalRegime` et l'enregistrer dans `regimes/index.ts` : le reste du calcul ne change pas.
 */
export interface ProfessionalRegime {
  /** Charges sociales dues sur le bénéfice du mois (0 si le bénéfice est négatif). */
  profitSocialCharges(
    profitCents: number,
    settings: ProfessionalYearSettingsValues,
  ): number
  /** Rémunération du mois pour un salaire brut donné (prévu dans l'éditeur, `SalaryForecast`). */
  remuneration(
    grossSalaryCents: number,
    settings: ProfessionalYearSettingsValues,
  ): Remuneration
}

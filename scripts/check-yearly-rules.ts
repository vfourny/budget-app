import { incomeTaxBrackets } from '@shared/fiscal/income-tax.rules'
// Rappel annuel des données légales codées en dur (barème de l'IR, plafonds…) : liste celles dont
// l'année demandée (par défaut l'année en cours) n'est pas encore renseignée dans le code.
// Lancé chaque mois par `.github/workflows/yearly-rules.yml`, qui ouvre une issue s'il en manque.
//
// Usage : pnpm rules:check [année]
//   → tout est à jour : code 0, rien sur stdout ;
//   → il en manque : code 1, checklist Markdown sur stdout (corps de l'issue).
import { hasMicroBicCeiling } from '@shared/fiscal/lmnp.rules'

interface YearlyRule {
  /** Fichier où ajouter l'année. */
  file: string
  /** `true` si l'année est renseignée dans le code. */
  isFilled: (year: number) => boolean
  /** Ce que la règle contient (texte du rapport, pas de l'UI). */
  name: string
  /** Où trouver la valeur officielle. */
  source: string
}

/**
 * ✏️ Toute donnée légale qui change chaque année et vit dans le code DOIT être déclarée ici :
 * c'est ce qui garantit qu'on pensera à la mettre à jour.
 */
const YEARLY_RULES: readonly YearlyRule[] = [
  {
    file: 'shared/fiscal/income-tax.rules.ts',
    isFilled: (year) => incomeTaxBrackets(year) !== undefined,
    name: "Barème de l'impôt sur le revenu (loi de finances de l'année)",
    source: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F1419',
  },
  {
    file: 'shared/fiscal/lmnp.rules.ts',
    isFilled: hasMicroBicCeiling,
    name: 'Plafond de recettes du micro-BIC (location meublée longue durée)',
    source: 'Code général des impôts, art. 50-0 (revalorisé tous les 3 ans)',
  },
]

const year = Number(process.argv[2] ?? new Date().getFullYear())
if (!Number.isInteger(year)) {
  process.stderr.write(`Année invalide : ${process.argv[2]}\n`)
  process.exit(2)
}

const missing = YEARLY_RULES.filter((rule) => !rule.isFilled(year))
if (missing.length > 0) {
  const lines = [
    `Données légales **${year}** à renseigner dans le code :`,
    '',
    ...missing.map(
      (rule) =>
        `- [ ] ${rule.name} — \`${rule.file}\` — source : ${rule.source}`,
    ),
    '',
    'Une PR par année, montants vérifiés contre la source officielle.',
  ]
  process.stdout.write(`${lines.join('\n')}\n`)
  process.exit(1)
}

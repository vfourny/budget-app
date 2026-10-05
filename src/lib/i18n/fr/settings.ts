/** Réglages : parts du revenu par enveloppe. */
export const settings = {
  eyebrow: "Configuration",
  title: "Réglages",
  tabs: {
    personal: "Perso",
    professional: "Pro · Stygma",
  },
  shares: {
    title: "Parts du revenu par enveloppe",
    description:
      "Méthode des 5 comptes : le dashboard Perso compare tes dépenses réelles à ces parts de ton revenu du mois.",
    loadFailed: "Impossible de charger les parts.",
    totalOk: "Total : 100 %",
    totalOver: (total: number) => `Total : ${total} % — dépasse 100 %`,
    totalRemaining: (total: number, remaining: number) =>
      `Total : ${total} % — il reste ${remaining} % à affecter`,
    saveFailed: "Enregistrement impossible",
    resetDefaults: "Valeurs par défaut",
  },
  pro: {
    title: "Régime de Stygma",
    description:
      "Taux, clés de répartition et régime utilisés par l'écran Pro, année par année. Valeurs d'exemple : à valider avec ton comptable.",
    loadFailed: "Impossible de charger les règles pro.",
    year: "Année d'application",
    configured: "configuré",
    yearNote: {
      own: (year: number) => `Valeurs enregistrées pour ${year}.`,
      inherited: (year: number, fromYear: number) =>
        `Rien d'enregistré pour ${year} : valeurs reprises de ${fromYear}. Enregistre pour les figer sans toucher aux autres années.`,
      default: (year: number) => `Rien d'enregistré pour ${year} : valeurs par défaut.`,
    },
    regime: "Régime de la société",
    soon: "Bientôt",
    active: "Actif",
    regimeNote:
      "Les règles sont propres à chaque année : modifier un taux, le barème km ou le régime d'une année ne change pas les autres. Seule la SAS à l'IR est disponible pour l'instant.",
    irOption: {
      label: "Option à l'IR : première année",
      notActive: (year: number) => `Option pas encore active en ${year}.`,
      exercise: (exercise: number, max: number, year: number) =>
        `Exercice ${exercise} sur ${max} maximum pour ${year}.`,
      exceeded: (exercise: number, max: number) =>
        `Exercice ${exercise} : au-delà des ${max} exercices maximum, l'option IR n'est plus possible.`,
    },
    groups: {
      salary: {
        title: "Cotisations sur salaire",
        description: "Président assimilé salarié : ces taux s'appliquent au salaire brut versé.",
      },
      profit: {
        title: "Quote-part de bénéfice (IR)",
        description:
          "Distinct des cotisations : ce sont des charges sociales sur ta part de bénéfice, réglées en perso.",
      },
      mixedCosts: {
        title: "Frais mixtes et déplacements",
        description:
          "Quote-part remboursée par Stygma sur les frais payés en perso, et barème kilométrique.",
      },
    },
    units: { euros: "€", percent: "%", squareMeters: "m²", days: "j", eurosPerKm: "€/km" },
    fields: {
      grossSalaryCents: {
        label: "Salaire brut mensuel",
        hint: "Fixe chaque mois (bulletin de paie). Le net versé et les prélèvements s'en déduisent.",
      },
      employerContributionBp: {
        label: "Cotisations patronales",
        hint: "Part employeur, en plus du brut (bulletin : charges patronales ÷ brut). Elle inclut URSSAF, retraite complémentaire, santé et prévoyance.",
      },
      employeeContributionBp: {
        label: "Cotisations salariales",
        hint: "Retenues sur le brut (bulletin : total à déduire ÷ brut), CSG/CRDS comprises. Pas un coût en plus pour la société.",
      },
      taxableNetBp: {
        label: "Net imposable (% du brut)",
        hint: "Base du prélèvement à la source (bulletin : net imposable ÷ brut).",
      },
      withholdingTaxBp: {
        label: "Prélèvement à la source",
        hint: "Taux personnalisé de ton bulletin, appliqué au net imposable : avance d'impôt sur le revenu.",
      },
      profitSocialChargesBp: {
        label: "Charges sociales sur la quote-part de bénéfice",
        hint: "Taux appliqué à ta part du bénéfice (9,7 % par défaut). Il dépend de la qualification de l'activité : à confirmer avec ton comptable.",
      },
      officeAreaDm2: {
        label: "Surface du bureau",
        hint: "Pièce dédiée à l'activité. Sert à la quote-part du loyer.",
      },
      homeAreaDm2: {
        label: "Surface du logement",
        hint: "Quote-part loyer = surface bureau / surface logement.",
      },
      mixedKeyNumerator: {
        label: "Clé autres frais : numérateur",
        hint: "Ex. 5 jours travaillés…",
      },
      mixedKeyDenominator: {
        label: "Clé autres frais : dénominateur",
        hint: "…sur 7 : internet, téléphone, électricité.",
      },
      mileageRateMilli: {
        label: "Barème kilométrique",
        hint: "Taux appliqué aux km à déclarer. Il change chaque année : à mettre à jour pour l'année choisie.",
      },
    },
    invalidAreas: "La surface du bureau ne peut pas dépasser celle du logement.",
    invalidKey: "Le numérateur de la clé ne peut pas dépasser le dénominateur.",
    savedFor: (year: number) =>
      `Enregistré pour ${year}. L'écran Pro utilise ces valeurs pour cette année.`,
    saveFailed: "Enregistrement impossible",
    resetDefaults: "Valeurs par défaut",
  },
  incomeTax: {
    title: "Barème de l'impôt sur le revenu",
    description:
      "Barème (1 part) en vigueur pour l'année choisie : il sert à l'IR estimé de la vue année du dashboard Perso. À renseigner chaque année.",
    year: "Année",
    loadFailed: "Impossible de charger le barème.",
    empty: "Barème non renseigné pour cette année : saisis les tranches ci-dessous.",
    from: "À partir de",
    rate: "Taux",
    addBracket: "Ajouter une tranche",
    removeBracket: "Supprimer la tranche",
    invalid: "Le barème doit commencer à 0 € et avoir des seuils strictement croissants.",
    saveFailed: "Enregistrement impossible",
  },
} as const;

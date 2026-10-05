/** Réglages : parts du revenu par enveloppe. */
export const settings = {
  eyebrow: "Configuration",
  title: "Réglages",
  tabs: {
    personal: "Perso",
    professional: "Pro · Stygma",
    professionalComingSoon: "Les règles de Stygma (taux, frais mixtes, barème km) arrivent ici.",
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

/** Écran Pro (pas encore construit). */
export const professional = {
  eyebrow: "Stygma SAS",
  title: "Pro",
  comingSoon:
    "La partie pro (TVA, facturation, prévisionnel) viendra après la validation du MVP perso.",
} as const;

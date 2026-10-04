/** Réglages : parts du revenu par enveloppe + liste des catégories. */
export const settings = {
  eyebrow: "Configuration",
  title: "Réglages",
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
  },
} as const;

/** Écran Pro (pas encore construit). */
export const professional = {
  eyebrow: "Stygma SAS",
  title: "Pro",
  comingSoon:
    "La partie pro (TVA, facturation, prévisionnel) viendra après la validation du MVP perso.",
} as const;

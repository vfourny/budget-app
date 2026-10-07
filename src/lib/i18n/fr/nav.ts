/** Navigation latérale. */
export const nav = {
  ariaLabel: "Navigation principale",
  brandName: "Budget",
  brandInitial: "B",
  personal: "Perso",
  professional: "Pro",
  apartments: "Appartements",
  imports: "Imports",
  settings: "Réglages",
  /** Libellé du bouton de thème = l'action du prochain clic (Système → Clair → Sombre). */
  colorScheme: {
    auto: "Suivre le thème du système",
    light: "Passer en thème clair",
    dark: "Passer en thème sombre",
  },
} as const;

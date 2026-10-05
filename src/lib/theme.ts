import {
  Button,
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from "@mantine/core";

/**
 * Thème « obsidian & platine » de la maquette (écran Tokens), à la place d'un `definePreset`
 * PrimeVue : un objet `createTheme` passé au `MantineProvider`.
 *
 * `dark` remplace la palette sombre par défaut de Mantine : c'est elle qui donne le fond de
 * page, les cartes, les bordures et le texte en mode sombre. Le mode clair (« platine ») est
 * défini par les variables `light` de `cssVariablesResolver` plus bas.
 * Dans les composants, ne pas utiliser `dark.N` directement (figé en sombre) : passer par les
 * variables `--app-*` / `--mantine-color-*` qui changent avec le thème.
 * Index : 0 texte, 1 texte atténué, 2 légende, 4 bordure, 5 survol, 6 champs, 7 cartes, 8 fond.
 */
const dark: MantineColorsTuple = [
  "#e7e5e0", // platine : texte principal
  "#a7a9ac", // platine atténué : texte secondaire
  "#8a8d92", // gris : légendes
  "#5c6066",
  "#2a2e34", // bordure forte : champs, boutons
  "#1c1f23", // surface haute : actif, survol
  "#0d0e10", // obsidian : fond des champs
  "#15171a", // surface : cartes
  "#0d0e10", // obsidian : fond de page
  "#0a0b0d", // obsidian profond : barre latérale
];

/** Accent doré. Index 6 = `#C9A45C` (accent de la maquette), 4 = `#D8B878` (survol). */
const gold: MantineColorsTuple = [
  "#f8f1e0",
  "#f0e3c2",
  "#e8d3a2",
  "#e0c788",
  "#d8b878",
  "#d0ac68",
  "#c9a45c",
  "#a88841",
  "#6b5a36",
  "#2a2418",
];

/** Ambre : dépassement, « à vérifier » (alertes, lignes à faible confiance). Index 6 = `#E0894A`. */
const amber: MantineColorsTuple = [
  "#fbeee5",
  "#f6d9c3",
  "#f3c4a0",
  "#f0a874",
  "#eb9b5e",
  "#e58f52",
  "#e0894a",
  "#c9743a",
  "#9a5a2e",
  "#2a1c12",
];

export const theme = createTheme({
  colors: { dark, gold, amber },
  primaryColor: "gold",
  primaryShade: 6,
  // Texte sombre sur les boutons dorés (contraste), comme dans la maquette.
  autoContrast: true,
  fontFamily: '"Manrope Variable", "Helvetica Neue", sans-serif',
  fontFamilyMonospace: '"SF Mono", Menlo, monospace',
  headings: {
    fontFamily: '"Instrument Serif", Georgia, serif',
    fontWeight: "400",
    sizes: {
      h1: { fontSize: "48px", lineHeight: "1" },
      h2: { fontSize: "28px", lineHeight: "1.2" },
      h3: { fontSize: "22px", lineHeight: "1.2" },
    },
  },
  // Rayons de la maquette : 16 cartes, 10 contrôles, 8 petits boutons.
  defaultRadius: "md",
  radius: { xs: "4px", sm: "8px", md: "10px", lg: "16px", xl: "24px" },
  components: {
    Button: Button.extend({ defaultProps: { fw: 700 } }),
  },
});

/**
 * Variables CSS dépendant du thème clair / sombre. Mantine les pose sur
 * `[data-mantine-color-scheme="light|dark"]` (≈ des tokens par thème dans un preset PrimeVue).
 * - `--mantine-color-*` : surcharge des couleurs sémantiques de Mantine (fond, bordures, texte).
 * - `--app-*` : couleurs de la maquette sans équivalent Mantine.
 * - En clair, les teintes d'accent utilisées comme texte (`gold.6`, `amber.3/4`, `teal.4`) sont
 *   assombries pour rester lisibles sur fond clair : les composants n'ont rien à changer.
 */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-body": "#f4f3ef",
    "--mantine-color-text": "#1b1d20",
    "--mantine-color-default": "#ffffff",
    "--mantine-color-default-border": "#d9d7d0",
    "--mantine-color-default-hover": "#ebe9e3",
    "--mantine-color-dimmed": "#5f6268",
    "--mantine-color-paper": "#ffffff",
    "--mantine-color-gold-6": "#9c7e3e",
    "--mantine-color-amber-3": "#c9743a",
    "--mantine-color-amber-4": "#b5622b",
    "--mantine-color-teal-4": "#0c8a63",
    "--app-border": "#e4e2dc",
    "--app-navbar-bg": "#ecebe6",
    "--app-hover": "#e4e2dc",
    "--app-caption": "#75787d",
  },
  dark: {
    "--mantine-color-body": "#0d0e10",
    "--mantine-color-default": "#0d0e10",
    "--mantine-color-default-border": "#2a2e34",
    "--mantine-color-default-hover": "#1c1f23",
    "--mantine-color-dimmed": "#a7a9ac",
    // Cartes (`Paper`, `Card`) : surface un cran au-dessus du fond.
    "--mantine-color-paper": "#15171a",
    "--app-border": "#22252a",
    "--app-navbar-bg": "#0a0b0d",
    "--app-hover": "#1c1f23",
    "--app-caption": "#8a8d92",
  },
});

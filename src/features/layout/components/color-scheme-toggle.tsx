import { ActionIcon, useMantineColorScheme, type MantineColorScheme } from "@mantine/core";
import { IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react";

import { fr } from "@/lib/i18n/fr";

/** Ordre de la bascule : Système → Clair → Sombre → Système… */
const NEXT = {
  auto: "light",
  light: "dark",
  dark: "auto",
} as const satisfies Record<MantineColorScheme, MantineColorScheme>;

const ICONS = {
  auto: IconDeviceDesktop,
  light: IconSun,
  dark: IconMoon,
} as const satisfies Record<MantineColorScheme, typeof IconSun>;

/**
 * Bouton du thème à 3 états : suivre le système (défaut), clair, sombre. L'icône montre le mode
 * choisi, le libellé l'action du prochain clic. Mantine mémorise le choix dans le localStorage
 * et, en mode « auto », suit `prefers-color-scheme` en direct. ≈ `useColorMode()` de Nuxt Color
 * Mode avec `preference: "system"`.
 */
export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const next = NEXT[colorScheme];
  const label = fr.nav.colorScheme[next];
  const Icon = ICONS[colorScheme];

  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      aria-label={label}
      title={label}
      onClick={() => setColorScheme(next)}
    >
      <Icon size={18} stroke={1.8} />
    </ActionIcon>
  );
}

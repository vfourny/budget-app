import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

import { fr } from "@/lib/i18n/fr";

/** Bouton soleil / lune qui bascule entre thème clair et sombre.
 * Mantine mémorise le choix dans le localStorage : il survit au rechargement. */
export function ColorSchemeToggle() {
  // `setColorScheme` change le thème ; `useComputedColorScheme` donne le thème réellement affiché
  // ("light" | "dark", jamais "auto") pour choisir l'icône. ≈ `useColorMode()` de Nuxt Color Mode.
  const { setColorScheme } = useMantineColorScheme();
  const isDark = useComputedColorScheme("dark") === "dark";
  const label = isDark ? fr.nav.switchToLight : fr.nav.switchToDark;

  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      aria-label={label}
      title={label}
      onClick={() => setColorScheme(isDark ? "light" : "dark")}
    >
      {isDark ? <IconSun size={18} stroke={1.8} /> : <IconMoon size={18} stroke={1.8} />}
    </ActionIcon>
  );
}

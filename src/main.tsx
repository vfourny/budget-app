import "@fontsource-variable/manrope";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@mantine/core/styles.css";
import "@mantine/dropzone/styles.css";
import "@/styles/global.css";

import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { App } from "@/app.tsx";
import { cssVariablesResolver, theme } from "@/lib/theme";
import { queryClient } from "@/lib/trpc";

// Point d'entrée ≈ createApp(App).use(plugin).mount("#root") en Vue.
// Chaque Provider ≈ un `app.use(...)` : il expose sa valeur à tout l'arbre via un Context React.
// - QueryClientProvider : le cache TanStack Query (hooks `useQuery` / `useMutation`).
// - BrowserRouter : l'URL courante pour `<Routes>`, `<NavLink>`, `useNavigate()` (≈ Vue Router en
//   mode history).
// - MantineProvider : le thème (≈ le plugin de thème de PrimeVue / Vuetify). L'app est toujours
//   sombre : pas de bascule clair/sombre.
// StrictMode (dev uniquement) monte les composants deux fois pour débusquer les effets mal nettoyés.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MantineProvider
          theme={theme}
          cssVariablesResolver={cssVariablesResolver}
          forceColorScheme="dark"
        >
          <App />
        </MantineProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app.tsx";
import { queryClient } from "@/lib/trpc";

import "@/index.css";

// Point d'entrée ≈ createApp(App).use(plugin).mount("#root") en Vue.
// QueryClientProvider ≈ app.use(...) : il rend le cache TanStack Query accessible aux hooks
// `useQuery` de tous les composants enfants (via un Context React).
// StrictMode (dev uniquement) monte les composants deux fois pour débusquer les effets mal nettoyés.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

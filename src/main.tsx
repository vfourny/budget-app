import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app.tsx";

import "@/index.css";

// Point d'entrée ≈ createApp(App).mount("#root") en Vue.
// StrictMode (dev uniquement) monte les composants deux fois pour débusquer les effets mal nettoyés.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Vite sert le front React (SPA) ; le plugin Nitro ajoute le backend (dossier server/)
// dans le même serveur de dev et le même build. Sur Vercel, server/ devient des Functions.
export default defineConfig({
  plugins: [react(), nitro()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@server": fileURLToPath(new URL("./server", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
});

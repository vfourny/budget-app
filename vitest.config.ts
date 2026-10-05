import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests unitaires des calculs purs (server/lib/pro, shared). Config séparée de vite.config.ts :
// pas besoin des plugins React / Nitro pour tester des fonctions.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@server": fileURLToPath(new URL("./server", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  test: { include: ["server/**/*.test.ts", "shared/**/*.test.ts"] },
});

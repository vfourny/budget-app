import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  // Même convention que Nuxt : server/api/**, server/routes/**, server/middleware/**…
  serverDir: "./server",
});

import { defineHandler } from "nitro/h3";

// GET /api/health — même convention de fichiers que server/api/ dans Nuxt.
export default defineHandler(() => ({ ok: true }));

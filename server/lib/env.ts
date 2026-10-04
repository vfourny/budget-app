import { z } from "zod";

// Variables d'environnement serveur, validées au démarrage : on échoue tôt avec un message clair
// plutôt qu'avec une erreur de connexion obscure au premier appel.
const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = serverEnvSchema.parse(process.env);

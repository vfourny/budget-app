import { GoogleGenAI } from "@google/genai";

import { env } from "@server/lib/env";

/** Modèle par défaut : Flash-Lite, rapide et peu cher, largement suffisant pour classer des
 * libellés. Surchargeable avec `GEMINI_MODEL` si le palier gratuit ne le propose pas. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

let client: GoogleGenAI | undefined;

/** Client Gemini partagé, créé à la demande. `undefined` si `GEMINI_API_KEY` n'est pas renseignée :
 * l'appelant décide de l'erreur à renvoyer (la clé est optionnelle au démarrage). */
export function getGeminiClient(): GoogleGenAI | undefined {
  if (!env.GEMINI_API_KEY) return undefined;
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

export function getGeminiModel(): string {
  return env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
}

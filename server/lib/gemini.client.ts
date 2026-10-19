import { GoogleGenAI } from '@google/genai'
import { env } from '@server/lib/env.config'

/** Client Gemini partagé (la clé est validée au démarrage par `env.ts`). */
export const gemini = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

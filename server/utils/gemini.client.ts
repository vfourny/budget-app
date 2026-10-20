import { GoogleGenAI } from '@google/genai'
import { env } from '@server/utils/env.config'

/** Client Gemini partagé (la clé est validée au démarrage par `env.config.ts`). */
export const gemini = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

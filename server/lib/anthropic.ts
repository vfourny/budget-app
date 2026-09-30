import Anthropic from "@anthropic-ai/sdk";

import { env } from "@server/lib/env";

let client: Anthropic | undefined;

/** Client Anthropic partagé, créé à la demande. `undefined` si `ANTHROPIC_API_KEY` n'est pas
 * renseignée : l'appelant décide de l'erreur à renvoyer (la clé est optionnelle au démarrage). */
export function getAnthropicClient(): Anthropic | undefined {
  if (!env.ANTHROPIC_API_KEY) return undefined;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

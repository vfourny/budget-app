import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "@server/generated/prisma/client";
import { env } from "@server/lib/env";

// Driver adapter Neon : passe par le driver serverless de Neon (WebSocket) au lieu d'une
// connexion TCP longue durée, adapté aux Functions Vercel éphémères. DATABASE_URL doit être
// l'URL *pooled* (host "-pooler").
function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// En dev, le hot reload ré-exécute ce module à chaque modif : sans ce cache sur globalThis,
// on ouvrirait un nouveau pool de connexions à chaque sauvegarde.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

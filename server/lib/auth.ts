import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { db } from "@server/lib/db";
import { env } from "@server/lib/env";

/**
 * Better Auth, monté sur `/api/auth/*` (`server/api/auth/[...all].ts`). Sessions en cookie
 * httpOnly (sécurisé en https), stockées en base via Prisma.
 *
 * App mono-utilisateur : l'inscription publique est **désactivée**. Le seul compte se crée en
 * local avec `pnpm auth:create-user` (qui passe par l'API interne, pas par l'endpoint HTTP).
 */
export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },
});

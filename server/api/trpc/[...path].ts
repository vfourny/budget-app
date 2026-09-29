import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { defineHandler } from "nitro/h3";

import { createTRPCContext } from "@server/trpc/init";
import { appRouter } from "@server/trpc/root";

// Route catch-all (comme dans Nuxt) : /api/trpc/<domaine>.<proc>, /api/trpc/xxx… arrivent ici.
// `event.req` est une Request standard, que l'adapter fetch de tRPC sait traiter directement.
export default defineHandler((event) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: event.req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: event.req.headers }),
    onError: ({ path, error }) => {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`tRPC error on ${path ?? "<no-path>"}:`, error);
      }
    },
  }),
);

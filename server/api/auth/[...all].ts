import { defineHandler } from "nitro/h3";

import { auth } from "@server/lib/auth";

// Catch-all : /api/auth/sign-in/email, /api/auth/get-session, /api/auth/sign-out…
// Better Auth gère lui-même le routage et les cookies à partir d'une Request standard.
export default defineHandler((event) => auth.handler(event.req));

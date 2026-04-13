import type { NextAuthConfig } from "next-auth";

// Edge-safe subset of the auth config (no Prisma, no bcrypt).
// Used by proxy.ts so the Edge runtime never loads Node.js-only modules.
// The full config (with Credentials provider) lives in lib/auth.ts.
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
};

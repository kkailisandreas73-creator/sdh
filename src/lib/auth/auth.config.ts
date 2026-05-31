import type { NextAuthConfig } from "next-auth";
import type { SessionUser } from "@/types";

/**
 * Edge-safe auth config for middleware only (no Node.js pg / DB imports).
 */
export const authConfig = {
  trustHost: true,
  providers: [],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as SessionUser).id = token.id as string;
        (session.user as SessionUser).role = token.role as SessionUser["role"];
        (session.user as SessionUser).accountId = (token.accountId as string) ?? null;
        (session.user as SessionUser).accountStatus =
          (token.accountStatus as string) ?? null;
        (session.user as SessionUser).paymentTerms =
          (token.paymentTerms as string) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

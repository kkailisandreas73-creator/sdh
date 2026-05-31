import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { repos } from "@/lib/db";
import type { SessionUser } from "@/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const row = await repos.usersRepo.findUserWithAccount(email);
        if (!row) return null;

        const valid = await bcrypt.compare(password, row.user.passwordHash);
        if (!valid) return null;

        return {
          id: row.user.id,
          email: row.user.email,
          name: row.user.name,
          role: row.user.role as "BUYER" | "ADMIN",
          accountId: row.user.accountId,
          accountStatus: row.account?.status ?? null,
          paymentTerms: row.account?.paymentTerms ?? null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as SessionUser;
        token.id = u.id;
        token.role = u.role;
        token.accountId = u.accountId;
        token.accountStatus = u.accountStatus;
        token.paymentTerms = u.paymentTerms;
      } else if (token.id) {
        try {
          const row = await repos.usersRepo.findUserWithAccountById(
            token.id as string
          );
          if (row) {
            token.role = row.user.role;
            token.accountId = row.user.accountId;
            token.accountStatus = row.account?.status ?? null;
            token.paymentTerms = row.account?.paymentTerms ?? null;
          }
        } catch (e) {
          console.error("[auth] jwt refresh failed:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as SessionUser).id = token.id as string;
        (session.user as SessionUser).role = token.role as "BUYER" | "ADMIN";
        (session.user as SessionUser).accountId = (token.accountId as string) ?? null;
        (session.user as SessionUser).accountStatus =
          (token.accountStatus as string) ?? null;
        (session.user as SessionUser).paymentTerms =
          (token.paymentTerms as string) ?? null;
      }
      return session;
    },
  },
});

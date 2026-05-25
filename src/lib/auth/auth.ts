import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
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

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { account: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as "BUYER" | "ADMIN",
          accountId: user.accountId,
          accountStatus: user.account?.status ?? null,
          paymentTerms: user.account?.paymentTerms ?? null,
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
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { account: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.accountId = dbUser.accountId;
          token.accountStatus = dbUser.account?.status ?? null;
          token.paymentTerms = dbUser.account?.paymentTerms ?? null;
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

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "BUYER" | "ADMIN";
      accountId: string | null;
      accountStatus: string | null;
      paymentTerms: string | null;
    };
  }

  interface User {
    id: string;
    role: "BUYER" | "ADMIN";
    accountId: string | null;
    accountStatus: string | null;
    paymentTerms: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "BUYER" | "ADMIN";
    accountId: string | null;
    accountStatus: string | null;
    paymentTerms: string | null;
  }
}

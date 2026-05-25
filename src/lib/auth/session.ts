import { auth } from "@/lib/auth/auth";
import type { SessionUser } from "@/types";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function isActiveBuyer(user: SessionUser): boolean {
  return user.role === "BUYER" && user.accountStatus === "ACTIVE";
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === "ADMIN";
}

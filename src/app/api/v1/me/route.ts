import { repos } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return jsonError("UNAUTHORIZED", "Not signed in", 401);

  const profile = await repos.usersRepo.findUserProfile(session.id);
  if (!profile) return jsonError("NOT_FOUND", "User not found", 404);

  const { user: dbUser, account, addresses } = profile;
  return jsonOk({
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      accountId: dbUser.accountId,
      account,
      addresses,
    },
  });
}

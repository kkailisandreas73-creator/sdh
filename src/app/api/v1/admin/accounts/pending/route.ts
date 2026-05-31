import { repos } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth/session";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const accounts = await repos.accountsRepo.listPendingAccounts();
  return jsonOk({ accounts });
}

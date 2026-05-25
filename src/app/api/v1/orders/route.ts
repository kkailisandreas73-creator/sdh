import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { listOrdersForAccount } from "@/lib/services/order.service";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isActiveBuyer(user) || !user.accountId) {
    return jsonError("FORBIDDEN", "Active buyer account required", 403);
  }
  const orders = await listOrdersForAccount(user.accountId);
  return jsonOk({ orders });
}

import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { getOrder } from "@/lib/services/order.service";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !isActiveBuyer(user) || !user.accountId) {
    return jsonError("FORBIDDEN", "Active buyer account required", 403);
  }
  const { id } = await params;
  const order = await getOrder(id, user.accountId);
  if (!order) return jsonError("NOT_FOUND", "Order not found", 404);
  return jsonOk({ order });
}

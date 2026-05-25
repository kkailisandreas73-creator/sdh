import { NextRequest } from "next/server";
import { getSessionUser, isAdmin } from "@/lib/auth/session";
import { listAllOrders, updateOrderStatus } from "@/lib/services/order.service";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);
  const orders = await listAllOrders();
  return jsonOk({ orders });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const { orderId, status, carrier, trackingNumber } = await req.json();
  const order = await updateOrderStatus(orderId, status, {
    carrier,
    trackingNumber,
  });
  return jsonOk({ order });
}

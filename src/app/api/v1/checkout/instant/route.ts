import { NextRequest } from "next/server";
import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import {
  createInstantOrder,
  createStripePaymentIntent,
  finalizeInstantCheckout,
} from "@/lib/services/checkout.service";
import { checkoutSchema } from "@/lib/validators";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isActiveBuyer(user) || !user.accountId) {
    return jsonError("FORBIDDEN", "Active buyer account required", 403);
  }

  const body = await req.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid input", 400);

  try {
    const order = await createInstantOrder({
      userId: user.id,
      accountId: user.accountId,
      shippingAddressId: parsed.data.shippingAddressId,
      poNumber: parsed.data.poNumber,
      paymentTerms: user.paymentTerms ?? "CARD_ONLY",
    });

    if (user.paymentTerms === "NET30") {
      await finalizeInstantCheckout(user.id, order.id);
      return jsonOk({
        orderId: order.id,
        status: order.status,
        paymentMethod: "INVOICE_NET30",
      });
    }

    const payment = await createStripePaymentIntent(order.id);
    if (payment.mock) {
      const { markOrderPaid } = await import("@/lib/services/checkout.service");
      await markOrderPaid(order.id);
      await finalizeInstantCheckout(user.id, order.id);
      return jsonOk({
        orderId: order.id,
        status: "PAID",
        mock: true,
        message: "Stripe not configured — order marked paid in dev mode",
      });
    }

    return jsonOk({
      orderId: order.id,
      clientSecret: payment.clientSecret,
    });
  } catch (e) {
    return jsonError("CHECKOUT_FAILED", (e as Error).message, 400);
  }
}

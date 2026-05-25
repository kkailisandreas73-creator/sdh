import { NextRequest } from "next/server";
import Stripe from "stripe";
import { markOrderPaid, finalizeInstantCheckout } from "@/lib/services/checkout.service";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return jsonError("NOT_CONFIGURED", "Stripe webhook not configured", 503);
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return jsonError("VALIDATION", "Missing signature", 400);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return jsonError("VALIDATION", "Invalid signature", 400);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata.orderId;
    if (orderId) {
      await markOrderPaid(orderId);
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order) await finalizeInstantCheckout(order.userId, orderId);
    }
  }

  return jsonOk({ received: true });
}

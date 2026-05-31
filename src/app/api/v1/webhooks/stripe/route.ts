import { NextRequest } from "next/server";
import Stripe from "stripe";
import { repos } from "@/lib/db";
import { markOrderPaid } from "@/lib/services/checkout.service";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    const body = await req.json();
    const orderId = body?.data?.object?.metadata?.orderId;
    if (orderId) await markOrderPaid(orderId);
    return jsonOk({ received: true, mock: true });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const sig = req.headers.get("stripe-signature");
  if (!sig) return jsonError("BAD_REQUEST", "Missing signature", 400);

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return jsonError("BAD_REQUEST", "Invalid signature", 400);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata?.orderId;
    if (orderId) {
      const order = await repos.ordersRepo.getOrderById(orderId);
      if (order) await markOrderPaid(orderId);
    }
  }

  return jsonOk({ received: true });
}

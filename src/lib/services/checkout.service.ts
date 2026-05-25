import { prisma } from "@/lib/db";
import { getCartView, clearCart } from "@/lib/services/cart.service";
import Stripe from "stripe";

const TAX_RATE = 0.08;
const SHIPPING_FLAT = 25;

export async function getLineEligibility(
  productId: string,
  quantity: number
): Promise<"instant" | "quoteOnly"> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { inventory: true },
  });
  if (product.quoteOnly || !product.allowInstantCheckout) return "quoteOnly";
  const available =
    (product.inventory?.quantityOnHand ?? 0) - (product.inventory?.reserved ?? 0);
  if (available < quantity) return "quoteOnly";
  return "instant";
}

export async function getInstantEligibleLines(
  userId: string,
  accountId: string | null
) {
  const cart = await getCartView(userId, accountId);
  return cart.items.filter((l) => l.eligibility === "instant");
}

export async function createInstantOrder(params: {
  userId: string;
  accountId: string;
  shippingAddressId: string;
  poNumber?: string;
  paymentTerms: string;
}) {
  const lines = await getInstantEligibleLines(params.userId, params.accountId);
  if (lines.length === 0) throw new Error("NO_INSTANT_LINES");

  const quoteOnly = await getCartView(params.userId, params.accountId);
  const blocked = quoteOnly.items.filter((l) => l.eligibility !== "instant");
  if (blocked.length > 0 && lines.length < quoteOnly.items.length) {
    // partial instant allowed only if caller passes only instant - for full cart check
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const tax = subtotal * TAX_RATE;
  const shipping = SHIPPING_FLAT;
  const total = subtotal + tax + shipping;

  const paymentMethod =
    params.paymentTerms === "NET30" ? "INVOICE_NET30" : "CARD";
  const status =
    paymentMethod === "INVOICE_NET30" ? "AWAITING_PAYMENT" : "DRAFT";

  const order = await prisma.order.create({
    data: {
      accountId: params.accountId,
      userId: params.userId,
      status,
      paymentMethod,
      subtotal,
      tax,
      shipping,
      total,
      poNumber: params.poNumber,
      lines: {
        create: lines.map((l) => ({
          productId: l.productId,
          skuSnapshot: l.product.sku,
          nameSnapshot: l.product.name,
          quantity: l.quantity,
          unitPrice: l.product.unitPrice,
          lineTotal: l.lineTotal,
        })),
      },
    },
    include: { lines: true },
  });

  for (const line of lines) {
    await prisma.inventory.update({
      where: { productId: line.productId },
      data: { reserved: { increment: line.quantity } },
    });
  }

  return order;
}

export async function createStripePaymentIntent(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!process.env.STRIPE_SECRET_KEY) {
    return { clientSecret: null, mock: true, orderId: order.id };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(order.total * 100),
    currency: "usd",
    metadata: { orderId: order.id },
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { stripePaymentIntentId: intent.id },
  });
  return { clientSecret: intent.client_secret, orderId: order.id };
}

export async function markOrderPaid(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "PAID" },
  });
  const lines = await prisma.orderLine.findMany({ where: { orderId } });
  for (const line of lines) {
    await prisma.inventory.update({
      where: { productId: line.productId },
      data: {
        quantityOnHand: { decrement: line.quantity },
        reserved: { decrement: line.quantity },
      },
    });
  }
}

export async function finalizeInstantCheckout(
  userId: string,
  orderId: string
) {
  await clearCart(userId);
  return orderId;
}

export { TAX_RATE, SHIPPING_FLAT };

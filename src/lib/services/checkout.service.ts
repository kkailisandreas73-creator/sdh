import { withTransaction, repos } from "@/lib/db";
import { getCartView, clearCart } from "@/lib/services/cart.service";
import Stripe from "stripe";

const TAX_RATE = 0.08;
const SHIPPING_FLAT = 25;

export async function getLineEligibility(
  productId: string,
  quantity: number
): Promise<"instant" | "quoteOnly"> {
  const product = await repos.productsRepo.findProductDetail({
    id: productId,
    activeOnly: true,
  });
  if (!product) throw new Error("NOT_FOUND");
  if (product.quoteOnly || !product.allowInstantCheckout) return "quoteOnly";
  const available =
    (product.inventory?.quantityOnHand ?? 0) -
    (product.inventory?.reserved ?? 0);
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

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const tax = subtotal * TAX_RATE;
  const shipping = SHIPPING_FLAT;
  const total = subtotal + tax + shipping;

  const paymentMethod =
    params.paymentTerms === "NET30" ? "INVOICE_NET30" : "CARD";
  const status =
    paymentMethod === "INVOICE_NET30" ? "AWAITING_PAYMENT" : "DRAFT";

  const order = await withTransaction(async (client) => {
    const created = await repos.ordersRepo.createOrderWithLines(
      {
        accountId: params.accountId,
        userId: params.userId,
        status,
        paymentMethod,
        subtotal,
        tax,
        shipping,
        total,
        poNumber: params.poNumber,
        lines: lines.map((l) => ({
          productId: l.productId,
          sku: l.product.sku,
          name: l.product.name,
          quantity: l.quantity,
          unitPrice: l.product.unitPrice,
          lineTotal: l.lineTotal,
        })),
      },
      client
    );
    for (const line of lines) {
      await repos.inventoryRepo.reserveInventory(
        line.productId,
        line.quantity,
        client
      );
    }
    return created;
  });

  return order;
}

export async function createStripePaymentIntent(orderId: string) {
  const order = await repos.ordersRepo.getOrderById(orderId);
  if (!order) throw new Error("NOT_FOUND");
  if (!process.env.STRIPE_SECRET_KEY) {
    return { clientSecret: null, mock: true, orderId: order.id };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(order.total * 100),
    currency: "usd",
    metadata: { orderId: order.id },
  });
  await repos.ordersRepo.updateOrderStripeIntent(order.id, intent.id);
  return { clientSecret: intent.client_secret, orderId: order.id };
}

export async function markOrderPaid(orderId: string) {
  await withTransaction(async (client) => {
    await repos.ordersRepo.updateOrderStatus(orderId, "PAID", undefined, client);
    const order = await repos.ordersRepo.getOrderById(orderId);
    if (!order) return;
    for (const line of order.lines) {
      await repos.inventoryRepo.fulfillInventory(
        line.productId,
        line.quantity,
        client
      );
    }
  });
}

export async function finalizeInstantCheckout(
  userId: string,
  orderId: string
) {
  await clearCart(userId);
  return orderId;
}

export { TAX_RATE, SHIPPING_FLAT };

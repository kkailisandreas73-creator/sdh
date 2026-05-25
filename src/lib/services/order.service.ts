import { prisma } from "@/lib/db";

export async function createOrderFromLines(params: {
  accountId: string;
  userId: string;
  quoteId?: string;
  lines: {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  paymentMethod: string;
  status: string;
  poNumber?: string;
  stripePaymentIntentId?: string;
}) {
  const subtotal = params.lines.reduce((s, l) => s + l.lineTotal, 0);
  const tax = subtotal * 0.08;
  const shipping = 25;
  const total = subtotal + tax + shipping;

  return prisma.order.create({
    data: {
      accountId: params.accountId,
      userId: params.userId,
      quoteId: params.quoteId,
      status: params.status,
      paymentMethod: params.paymentMethod,
      subtotal,
      tax,
      shipping,
      total,
      poNumber: params.poNumber,
      stripePaymentIntentId: params.stripePaymentIntentId,
      lines: {
        create: params.lines.map((l) => ({
          productId: l.productId,
          skuSnapshot: l.sku,
          nameSnapshot: l.name,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
      },
    },
    include: { lines: true, shipments: true },
  });
}

export async function listOrdersForAccount(accountId: string) {
  return prisma.order.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    include: { lines: true, shipments: true },
  });
}

export async function getOrder(id: string, accountId?: string) {
  return prisma.order.findFirst({
    where: { id, ...(accountId ? { accountId } : {}) },
    include: { lines: true, shipments: true, quote: true },
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  tracking?: { carrier?: string; trackingNumber?: string }
) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });
  if (tracking?.trackingNumber) {
    await prisma.shipment.create({
      data: {
        orderId,
        carrier: tracking.carrier ?? "Standard",
        trackingNumber: tracking.trackingNumber,
        shippedAt: new Date(),
      },
    });
  }
  return order;
}

export async function listAllOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { lines: true, account: true, user: true },
  });
}

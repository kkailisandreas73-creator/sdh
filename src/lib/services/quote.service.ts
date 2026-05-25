import { prisma } from "@/lib/db";
import { getCartView, clearCart } from "@/lib/services/cart.service";
import { createOrderFromLines } from "@/lib/services/order.service";

export async function submitQuote(params: {
  userId: string;
  accountId: string;
  buyerNotes?: string;
  lineIds?: string[];
}) {
  const cart = await getCartView(params.userId, params.accountId);
  let lines = cart.items;
  if (params.lineIds?.length) {
    lines = lines.filter((l) => params.lineIds!.includes(l.id));
  }
  if (lines.length === 0) throw new Error("EMPTY_CART");

  const quote = await prisma.quote.create({
    data: {
      accountId: params.accountId,
      userId: params.userId,
      status: "SUBMITTED",
      buyerNotes: params.buyerNotes,
      submittedAt: new Date(),
      lines: {
        create: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          requestedPrice: l.product.unitPrice,
        })),
      },
    },
    include: { lines: { include: { product: true } } },
  });

  await prisma.auditLog.create({
    data: {
      actorId: params.userId,
      entity: "Quote",
      entityId: quote.id,
      action: "SUBMITTED",
      payload: JSON.stringify({ lineCount: lines.length }),
    },
  });

  return quote;
}

export async function adminPriceQuote(
  quoteId: string,
  lines: { lineId: string; quotedUnitPrice: number }[],
  adminNotes?: string
) {
  for (const line of lines) {
    await prisma.quoteLine.update({
      where: { id: line.lineId },
      data: { quotedUnitPrice: line.quotedUnitPrice },
    });
  }
  return prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: "QUOTED",
      adminNotes,
      quotedAt: new Date(),
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    include: { lines: { include: { product: true } } },
  });
}

export async function acceptQuote(quoteId: string, userId: string) {
  const quote = await prisma.quote.findFirstOrThrow({
    where: { id: quoteId, userId, status: "QUOTED" },
    include: { lines: { include: { product: true } } },
  });

  const orderLines = quote.lines.map((l) => ({
    productId: l.productId,
    sku: l.product.sku,
    name: l.product.name,
    quantity: l.quantity,
    unitPrice: l.quotedUnitPrice ?? 0,
    lineTotal: (l.quotedUnitPrice ?? 0) * l.quantity,
  }));

  const order = await createOrderFromLines({
    accountId: quote.accountId,
    userId,
    quoteId: quote.id,
    lines: orderLines,
    paymentMethod: "INVOICE_NET30",
    status: "AWAITING_PAYMENT",
  });

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "CONVERTED" },
  });

  await clearCart(userId);
  return order;
}

export async function listQuotesForAccount(accountId: string) {
  return prisma.quote.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    include: { lines: { include: { product: true } } },
  });
}

export async function listAllQuotes(status?: string) {
  return prisma.quote.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      lines: { include: { product: true } },
      account: true,
      user: true,
    },
  });
}

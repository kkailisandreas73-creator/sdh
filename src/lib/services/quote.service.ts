import { repos } from "@/lib/db";
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

  const quote = await repos.quotesRepo.createQuoteWithLines({
    accountId: params.accountId,
    userId: params.userId,
    status: "SUBMITTED",
    buyerNotes: params.buyerNotes,
    submittedAt: new Date(),
    lines: lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      requestedPrice: l.product.unitPrice,
    })),
  });

  await repos.auditRepo.createAuditLog({
    actorId: params.userId,
    entity: "Quote",
    entityId: quote.id,
    action: "SUBMITTED",
    payload: JSON.stringify({ lineCount: lines.length }),
  });

  return quote;
}

export async function adminPriceQuote(
  quoteId: string,
  lines: { lineId: string; quotedUnitPrice: number }[],
  adminNotes?: string
) {
  for (const line of lines) {
    await repos.quotesRepo.updateQuoteLinePrice(line.lineId, line.quotedUnitPrice);
  }
  return repos.quotesRepo.updateQuoteAdmin(quoteId, {
    status: "QUOTED",
    adminNotes,
    quotedAt: new Date(),
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });
}

export async function acceptQuote(quoteId: string, userId: string) {
  const quote = await repos.quotesRepo.findQuoteForUser(quoteId, userId, "QUOTED");
  if (!quote) throw new Error("NOT_FOUND");

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

  await repos.quotesRepo.updateQuoteStatus(quoteId, "CONVERTED");

  await clearCart(userId);
  return order;
}

export async function listQuotesForAccount(accountId: string) {
  return repos.quotesRepo.listQuotesForAccount(accountId);
}

export async function listAllQuotes(status?: string) {
  return repos.quotesRepo.listAllQuotes(status);
}

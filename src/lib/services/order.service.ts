import { repos } from "@/lib/db";

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

  return repos.ordersRepo.createOrderWithLines({
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
    lines: params.lines,
  });
}

export async function listOrdersForAccount(accountId: string) {
  return repos.ordersRepo.listOrdersForAccount(accountId);
}

export async function getOrder(id: string, accountId?: string) {
  return repos.ordersRepo.getOrderById(id, accountId);
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  tracking?: { carrier?: string; trackingNumber?: string }
) {
  return repos.ordersRepo.updateOrderStatus(orderId, status, tracking);
}

export async function listAllOrders() {
  return repos.ordersRepo.listAllOrders();
}

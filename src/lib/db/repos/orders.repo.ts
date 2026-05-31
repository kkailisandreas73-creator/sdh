import { pool, query, type DbClient } from "../pool";
import {
  mapAccount,
  mapOrder,
  mapOrderLine,
  mapQuote,
  mapShipment,
  mapUser,
} from "../mappers";
import type { OrderLine, OrderWithRelations, Shipment } from "../types";
import { newId } from "../id";

async function loadOrderLines(orderId: string, client?: DbClient): Promise<OrderLine[]> {
  const { rows } = await query(
    `SELECT * FROM order_lines WHERE order_id = $1`,
    [orderId],
    client
  );
  return rows.map(mapOrderLine);
}

async function loadShipments(orderId: string, client?: DbClient): Promise<Shipment[]> {
  const { rows } = await query(
    `SELECT * FROM shipments WHERE order_id = $1`,
    [orderId],
    client
  );
  return rows.map(mapShipment);
}

export async function createOrderWithLines(
  params: {
    accountId: string;
    userId: string;
    quoteId?: string | null;
    status: string;
    paymentMethod: string;
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    poNumber?: string | null;
    stripePaymentIntentId?: string | null;
    lines: {
      productId: string;
      sku: string;
      name: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }[];
  },
  client?: DbClient
): Promise<OrderWithRelations> {
  const id = newId();
  const now = new Date();
  const run = async (c: DbClient) => {
    await query(
      `INSERT INTO orders (id, account_id, user_id, quote_id, status, payment_method,
        subtotal, tax, shipping, total, po_number, stripe_payment_intent_id, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        id,
        params.accountId,
        params.userId,
        params.quoteId ?? null,
        params.status,
        params.paymentMethod,
        params.subtotal,
        params.tax,
        params.shipping,
        params.total,
        params.poNumber ?? null,
        params.stripePaymentIntentId ?? null,
        now,
      ],
      c
    );
    for (const line of params.lines) {
      await query(
        `INSERT INTO order_lines (id, order_id, product_id, sku_snapshot, name_snapshot,
          quantity, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          newId(),
          id,
          line.productId,
          line.sku,
          line.name,
          line.quantity,
          line.unitPrice,
          line.lineTotal,
        ],
        c
      );
    }
    const { rows } = await query(`SELECT * FROM orders WHERE id = $1`, [id], c);
    const lines = await loadOrderLines(id, c);
    const shipments = await loadShipments(id, c);
    return { ...mapOrder(rows[0]), lines, shipments };
  };
  return client ? run(client) : run(pool);
}

export async function listOrdersForAccount(accountId: string) {
  const { rows } = await query(
    `SELECT * FROM orders WHERE account_id = $1 ORDER BY created_at DESC`,
    [accountId]
  );
  const result: OrderWithRelations[] = [];
  for (const row of rows) {
    const order = mapOrder(row);
    result.push({
      ...order,
      lines: await loadOrderLines(order.id),
      shipments: await loadShipments(order.id),
    });
  }
  return result;
}

export async function getOrderById(
  id: string,
  accountId?: string
): Promise<OrderWithRelations | null> {
  const params: unknown[] = [id];
  let sql = `SELECT * FROM orders WHERE id = $1`;
  if (accountId) {
    params.push(accountId);
    sql += ` AND account_id = $2`;
  }
  const { rows } = await query(sql, params);
  if (!rows[0]) return null;
  const order = mapOrder(rows[0]);
  const lines = await loadOrderLines(order.id);
  const shipments = await loadShipments(order.id);
  let quote = null;
  if (order.quoteId) {
    const qRes = await query(`SELECT * FROM quotes WHERE id = $1`, [order.quoteId]);
    quote = qRes.rows[0] ? mapQuote(qRes.rows[0]) : null;
  }
  return { ...order, lines, shipments, quote };
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  tracking?: { carrier?: string; trackingNumber?: string },
  client?: DbClient
) {
  await query(
    `UPDATE orders SET status = $2, updated_at = $3 WHERE id = $1`,
    [orderId, status, new Date()],
    client
  );
  if (tracking?.trackingNumber) {
    await query(
      `INSERT INTO shipments (id, order_id, carrier, tracking_number, shipped_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        newId(),
        orderId,
        tracking.carrier ?? "Standard",
        tracking.trackingNumber,
        new Date(),
      ],
      client
    );
  }
  return getOrderById(orderId);
}

export async function updateOrderStripeIntent(orderId: string, intentId: string) {
  await query(
    `UPDATE orders SET stripe_payment_intent_id = $2, updated_at = $3 WHERE id = $1`,
    [orderId, intentId, new Date()]
  );
}

export async function listAllOrders() {
  const { rows } = await query(
    `SELECT o.*, a.company_name, u.email AS user_email, u.name AS user_name
     FROM orders o
     JOIN accounts a ON a.id = o.account_id
     JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC`
  );
  const result: OrderWithRelations[] = [];
  for (const row of rows) {
    const order = mapOrder(row);
    result.push({
      ...order,
      lines: await loadOrderLines(order.id),
      shipments: await loadShipments(order.id),
      account: mapAccount({
        id: order.accountId,
        company_name: row.company_name,
        tax_id: null,
        status: "ACTIVE",
        tier_id: null,
        payment_terms: "CARD_ONLY",
        approved_at: null,
        approved_by: null,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
      }),
      user: mapUser({
        id: order.userId,
        email: row.user_email,
        password_hash: "",
        name: row.user_name,
        role: "BUYER",
        account_id: order.accountId,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
      }),
    });
  }
  return result;
}

export async function countOrders() {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM orders`
  );
  return Number(rows[0]?.count ?? 0);
}

export async function countQuotesByStatus(status: string) {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM quotes WHERE status = $1`,
    [status]
  );
  return Number(rows[0]?.count ?? 0);
}

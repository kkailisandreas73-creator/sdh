import { pool, query, type DbClient } from "../pool";
import { mapAccount, mapProduct, mapQuote, mapQuoteLine, mapUser } from "../mappers";
import type { QuoteWithLines } from "../types";
import { newId } from "../id";

async function loadQuoteLines(quoteId: string, client?: DbClient) {
  const { rows } = await query(
    `SELECT ql.*, p.sku, p.name, p.slug, p.description, p.category_id, p.brand, p.moq,
            p.allow_instant_checkout, p.quote_only, p.is_active, p.metadata, p.tags,
            p.created_at AS p_created_at, p.updated_at AS p_updated_at
     FROM quote_lines ql
     JOIN products p ON p.id = ql.product_id
     WHERE ql.quote_id = $1`,
    [quoteId],
    client
  );
  return rows.map((r) => ({
    ...mapQuoteLine(r),
    product: mapProduct({
      id: r.product_id,
      sku: r.sku,
      name: r.name,
      slug: r.slug,
      description: r.description,
      category_id: r.category_id,
      brand: r.brand,
      moq: r.moq,
      allow_instant_checkout: r.allow_instant_checkout,
      quote_only: r.quote_only,
      is_active: r.is_active,
      metadata: r.metadata,
      tags: r.tags,
      created_at: r.p_created_at,
      updated_at: r.p_updated_at,
    }),
  }));
}

export async function createQuoteWithLines(
  data: {
    accountId: string;
    userId: string;
    status: string;
    buyerNotes?: string | null;
    submittedAt?: Date | null;
    lines: { productId: string; quantity: number; requestedPrice?: number | null }[];
  },
  client?: DbClient
): Promise<QuoteWithLines> {
  const id = newId();
  const now = new Date();
  const run = async (c: DbClient) => {
    await query(
      `INSERT INTO quotes (id, account_id, user_id, status, buyer_notes, submitted_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        id,
        data.accountId,
        data.userId,
        data.status,
        data.buyerNotes ?? null,
        data.submittedAt ?? null,
        now,
      ],
      c
    );
    for (const line of data.lines) {
      await query(
        `INSERT INTO quote_lines (id, quote_id, product_id, quantity, requested_price)
         VALUES ($1,$2,$3,$4,$5)`,
        [newId(), id, line.productId, line.quantity, line.requestedPrice ?? null],
        c
      );
    }
    const { rows } = await query(`SELECT * FROM quotes WHERE id = $1`, [id], c);
    const lines = await loadQuoteLines(id, c);
    return { ...mapQuote(rows[0]), lines };
  };
  return client ? run(client) : run(pool);
}

export async function updateQuoteLinePrice(lineId: string, quotedUnitPrice: number) {
  await query(`UPDATE quote_lines SET quoted_unit_price = $2 WHERE id = $1`, [
    lineId,
    quotedUnitPrice,
  ]);
}

export async function updateQuoteAdmin(
  quoteId: string,
  data: {
    status: string;
    adminNotes?: string | null;
    quotedAt?: Date | null;
    validUntil?: Date | null;
  }
) {
  await query(
    `UPDATE quotes SET status = $2, admin_notes = $3, quoted_at = $4, valid_until = $5, updated_at = $6
     WHERE id = $1`,
    [
      quoteId,
      data.status,
      data.adminNotes ?? null,
      data.quotedAt ?? null,
      data.validUntil ?? null,
      new Date(),
    ]
  );
  return getQuoteById(quoteId);
}

export async function getQuoteById(quoteId: string): Promise<QuoteWithLines | null> {
  const { rows } = await query(`SELECT * FROM quotes WHERE id = $1`, [quoteId]);
  if (!rows[0]) return null;
  const lines = await loadQuoteLines(quoteId);
  return { ...mapQuote(rows[0]), lines };
}

export async function findQuoteForUser(quoteId: string, userId: string, status: string) {
  const { rows } = await query(
    `SELECT * FROM quotes WHERE id = $1 AND user_id = $2 AND status = $3`,
    [quoteId, userId, status]
  );
  if (!rows[0]) return null;
  const lines = await loadQuoteLines(quoteId);
  return { ...mapQuote(rows[0]), lines };
}

export async function updateQuoteStatus(quoteId: string, status: string) {
  await query(`UPDATE quotes SET status = $2, updated_at = $3 WHERE id = $1`, [
    quoteId,
    status,
    new Date(),
  ]);
}

export async function listQuotesForAccount(accountId: string) {
  const { rows } = await query(
    `SELECT * FROM quotes WHERE account_id = $1 ORDER BY created_at DESC`,
    [accountId]
  );
  const result: QuoteWithLines[] = [];
  for (const row of rows) {
    const lines = await loadQuoteLines(row.id as string);
    result.push({ ...mapQuote(row), lines });
  }
  return result;
}

export async function listAllQuotes(status?: string) {
  const { rows } = status
    ? await query(
        `SELECT q.*, a.company_name, u.email AS user_email, u.name AS user_name
         FROM quotes q
         JOIN accounts a ON a.id = q.account_id
         JOIN users u ON u.id = q.user_id
         WHERE q.status = $1
         ORDER BY q.created_at DESC`,
        [status]
      )
    : await query(
        `SELECT q.*, a.company_name, u.email AS user_email, u.name AS user_name
         FROM quotes q
         JOIN accounts a ON a.id = q.account_id
         JOIN users u ON u.id = q.user_id
         ORDER BY q.created_at DESC`
      );
  const result: QuoteWithLines[] = [];
  for (const row of rows) {
    const quote = mapQuote(row);
    const lines = await loadQuoteLines(quote.id);
    result.push({
      ...quote,
      lines,
      account: mapAccount({
        id: quote.accountId,
        company_name: row.company_name,
        tax_id: null,
        status: "ACTIVE",
        tier_id: null,
        payment_terms: "CARD_ONLY",
        approved_at: null,
        approved_by: null,
        created_at: quote.createdAt,
        updated_at: quote.updatedAt,
      }),
      user: mapUser({
        id: quote.userId,
        email: row.user_email,
        password_hash: "",
        name: row.user_name,
        role: "BUYER",
        account_id: quote.accountId,
        created_at: quote.createdAt,
        updated_at: quote.updatedAt,
      }),
    });
  }
  return result;
}

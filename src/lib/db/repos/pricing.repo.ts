import { query } from "../pool";
import { mapPriceList, mapPriceTier, mapProduct } from "../mappers";
import { newId } from "../id";

export async function findActiveOverride(accountId: string, productId: string) {
  const { rows } = await query(
    `SELECT * FROM account_price_overrides
     WHERE account_id = $1 AND product_id = $2
       AND (valid_to IS NULL OR valid_to >= NOW())
     ORDER BY valid_from DESC LIMIT 1`,
    [accountId, productId]
  );
  return rows[0] ? { unitPrice: Number(rows[0].unit_price) } : null;
}

export async function findDefaultPriceList() {
  const { rows } = await query(
    `SELECT * FROM price_lists WHERE is_default = true LIMIT 1`
  );
  return rows[0] ? mapPriceList(rows[0]) : null;
}

export async function findTiersForProduct(priceListId: string, productId: string) {
  const { rows } = await query(
    `SELECT * FROM price_tiers WHERE price_list_id = $1 AND product_id = $2 ORDER BY min_qty ASC`,
    [priceListId, productId]
  );
  return rows.map(mapPriceTier);
}

export async function listPriceListsWithTiers() {
  const { rows } = await query(`SELECT * FROM price_lists ORDER BY name ASC`);
  const lists = rows.map(mapPriceList);
  const result = [];
  for (const list of lists) {
    const tierRows = await query(
      `SELECT pt.*, p.sku, p.name AS product_name, p.slug AS product_slug
       FROM price_tiers pt
       JOIN products p ON p.id = pt.product_id
       WHERE pt.price_list_id = $1
       ORDER BY p.name ASC`,
      [list.id]
    );
    result.push({
      ...list,
      tiers: tierRows.rows.map((r) => ({
        ...mapPriceTier(r),
        product: mapProduct({
          id: r.product_id,
          sku: r.sku,
          name: r.product_name,
          slug: r.product_slug,
          description: "",
          category_id: "",
          brand: null,
          moq: 1,
          allow_instant_checkout: true,
          quote_only: false,
          is_active: true,
          metadata: null,
          tags: null,
          created_at: new Date(),
          updated_at: new Date(),
        }),
      })),
    });
  }
  return result;
}

export async function upsertPriceTier(data: {
  priceListId: string;
  productId: string;
  minQty: number;
  unitPrice: number;
}) {
  const existing = await query(
    `SELECT id FROM price_tiers WHERE price_list_id = $1 AND product_id = $2 AND min_qty = $3`,
    [data.priceListId, data.productId, data.minQty]
  );
  if (existing.rows[0]) {
    await query(`UPDATE price_tiers SET unit_price = $2 WHERE id = $1`, [
      existing.rows[0].id,
      data.unitPrice,
    ]);
    const { rows } = await query(`SELECT * FROM price_tiers WHERE id = $1`, [
      existing.rows[0].id,
    ]);
    return mapPriceTier(rows[0]);
  }
  const id = newId();
  await query(
    `INSERT INTO price_tiers (id, price_list_id, product_id, min_qty, unit_price)
     VALUES ($1,$2,$3,$4,$5)`,
    [id, data.priceListId, data.productId, data.minQty, data.unitPrice]
  );
  const { rows } = await query(`SELECT * FROM price_tiers WHERE id = $1`, [id]);
  return mapPriceTier(rows[0]);
}

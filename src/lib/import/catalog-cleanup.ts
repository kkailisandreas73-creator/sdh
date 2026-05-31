import { query } from "@/lib/db/pool";

/** Removes all catalog data (products, categories) and dependent rows. */
export async function cleanupCatalog() {
  // TRUNCATE is much faster than DELETE on large catalogs (avoids long locks/timeouts).
  await query(`
    TRUNCATE
      shipments,
      order_lines,
      orders,
      quote_lines,
      quotes,
      cart_items,
      carts,
      account_price_overrides,
      price_tiers,
      product_images,
      inventory,
      products,
      categories
    RESTART IDENTITY CASCADE
  `);
}

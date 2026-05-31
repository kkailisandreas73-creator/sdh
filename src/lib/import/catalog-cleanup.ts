import { query } from "@/lib/db/pool";

/** Removes all catalog data (products, categories) and dependent rows. */
export async function cleanupCatalog() {
  await query("DELETE FROM shipments");
  await query("DELETE FROM order_lines");
  await query("DELETE FROM orders");
  await query("DELETE FROM quote_lines");
  await query("DELETE FROM quotes");
  await query("DELETE FROM cart_items");
  await query("DELETE FROM account_price_overrides");
  await query("DELETE FROM price_tiers");
  await query("DELETE FROM product_images");
  await query("DELETE FROM inventory");
  await query("DELETE FROM products");
  await query("DELETE FROM categories");
}

import { query, type DbClient } from "../pool";
import { mapCart, mapCartItem } from "../mappers";
import { findProductDetail } from "./products.repo";
import type { CartItemWithProduct } from "../types";
import { newId } from "../id";

export async function findCartByUserId(userId: string) {
  const { rows } = await query(`SELECT * FROM carts WHERE user_id = $1`, [userId]);
  return rows[0] ? mapCart(rows[0]) : null;
}

export async function createCart(userId: string) {
  const id = newId();
  const now = new Date();
  await query(
    `INSERT INTO carts (id, user_id, updated_at) VALUES ($1,$2,$3)`,
    [id, userId, now]
  );
  return (await findCartByUserId(userId))!;
}

export async function listCartItemsWithProducts(
  cartId: string
): Promise<CartItemWithProduct[]> {
  const { rows } = await query(
    `SELECT * FROM cart_items WHERE cart_id = $1`,
    [cartId]
  );
  const items: CartItemWithProduct[] = [];
  for (const row of rows) {
    const item = mapCartItem(row);
    const product = await findProductDetail({ id: item.productId, activeOnly: true });
    if (!product) continue;
    items.push({ ...item, product });
  }
  return items;
}

export async function upsertCartItem(
  cartId: string,
  productId: string,
  quantity: number,
  client?: DbClient
) {
  await query(
    `INSERT INTO cart_items (id, cart_id, product_id, quantity)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (cart_id, product_id)
     DO UPDATE SET quantity = EXCLUDED.quantity`,
    [newId(), cartId, productId, quantity],
    client
  );
  await query(`UPDATE carts SET updated_at = $2 WHERE id = $1`, [cartId, new Date()], client);
}

export async function findCartItem(cartId: string, itemId: string) {
  const { rows } = await query(
    `SELECT * FROM cart_items WHERE id = $1 AND cart_id = $2`,
    [itemId, cartId]
  );
  return rows[0] ? mapCartItem(rows[0]) : null;
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  await query(`UPDATE cart_items SET quantity = $2 WHERE id = $1`, [itemId, quantity]);
}

export async function deleteCartItem(itemId: string) {
  await query(`DELETE FROM cart_items WHERE id = $1`, [itemId]);
}

export async function deleteCartItemsByCart(cartId: string) {
  await query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
}

export async function deleteCartItemScoped(cartId: string, itemId: string) {
  await query(`DELETE FROM cart_items WHERE id = $1 AND cart_id = $2`, [itemId, cartId]);
}

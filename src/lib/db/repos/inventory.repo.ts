import { query, type DbClient } from "../pool";
import { mapInventory } from "../mappers";

export async function findInventory(productId: string) {
  const { rows } = await query(`SELECT * FROM inventory WHERE product_id = $1`, [
    productId,
  ]);
  return rows[0] ? mapInventory(rows[0]) : null;
}

export async function reserveInventory(
  productId: string,
  quantity: number,
  client?: DbClient
) {
  await query(
    `UPDATE inventory SET reserved = reserved + $2 WHERE product_id = $1`,
    [productId, quantity],
    client
  );
}

export async function fulfillInventory(
  productId: string,
  quantity: number,
  client?: DbClient
) {
  await query(
    `UPDATE inventory SET
       quantity_on_hand = quantity_on_hand - $2,
       reserved = reserved - $2
     WHERE product_id = $1`,
    [productId, quantity],
    client
  );
}

export async function upsertInventory(
  productId: string,
  quantityOnHand: number,
  reserved = 0
) {
  await query(
    `INSERT INTO inventory (product_id, quantity_on_hand, reserved)
     VALUES ($1,$2,$3)
     ON CONFLICT (product_id)
     DO UPDATE SET quantity_on_hand = EXCLUDED.quantity_on_hand`,
    [productId, quantityOnHand, reserved]
  );
  return findInventory(productId);
}

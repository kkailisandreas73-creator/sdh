import { query, type DbClient } from "../pool";
import { mapCategory, mapInventory, mapProduct } from "../mappers";
import type { Product, ProductDetail } from "../types";

async function loadImages(productIds: string[], client?: DbClient) {
  if (productIds.length === 0) return new Map<string, { url: string; alt: string | null }[]>();
  const { rows } = await query<{
    product_id: string;
    url: string;
    alt: string | null;
  }>(
    `SELECT product_id, url, alt FROM product_images
     WHERE product_id = ANY($1::text[])
     ORDER BY sort_order ASC`,
    [productIds],
    client
  );
  const map = new Map<string, { url: string; alt: string | null }[]>();
  for (const row of rows) {
    const list = map.get(row.product_id) ?? [];
    list.push({ url: row.url, alt: row.alt });
    map.set(row.product_id, list);
  }
  return map;
}

async function loadInventory(productIds: string[], client?: DbClient) {
  if (productIds.length === 0) return new Map<string, ReturnType<typeof mapInventory>>();
  const { rows } = await query(
    `SELECT * FROM inventory WHERE product_id = ANY($1::text[])`,
    [productIds],
    client
  );
  const map = new Map<string, ReturnType<typeof mapInventory>>();
  for (const row of rows) {
    map.set(row.product_id, mapInventory(row));
  }
  return map;
}

export async function toProductDetail(
  row: Record<string, unknown>,
  images: { url: string; alt: string | null }[],
  inventory: ReturnType<typeof mapInventory> | null
): Promise<ProductDetail> {
  const product = mapProduct(row);
  return {
    ...product,
    category: {
      slug: row.category_slug as string,
      name: row.category_name as string,
      vertical: row.category_vertical as string,
    },
    images,
    inventory,
  };
}

const productSelect = `
  SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.vertical AS category_vertical
  FROM products p
  JOIN categories c ON c.id = p.category_id
`;

export async function findProductDetail(
  where: { id?: string; slug?: string; activeOnly?: boolean },
  client?: DbClient
): Promise<ProductDetail | null> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (where.id) {
    params.push(where.id);
    clauses.push(`p.id = $${params.length}`);
  }
  if (where.slug) {
    params.push(where.slug);
    clauses.push(`p.slug = $${params.length}`);
  }
  if (where.activeOnly) clauses.push(`p.is_active = true`);
  const { rows } = await query(
    `${productSelect} WHERE ${clauses.join(" AND ")} LIMIT 1`,
    params,
    client
  );
  if (rows.length === 0) return null;
  const images = await loadImages([rows[0].id as string], client);
  const inv = await loadInventory([rows[0].id as string], client);
  return toProductDetail(
    rows[0],
    images.get(rows[0].id as string) ?? [],
    inv.get(rows[0].id as string) ?? null
  );
}

export async function listProducts(params: {
  vertical?: string | null;
  categorySlug?: string;
  q?: string;
  page: number;
  pageSize: number;
  activeOnly?: boolean;
}): Promise<{ items: ProductDetail[]; total: number }> {
  const conditions = ["1=1"];
  const sqlParams: unknown[] = [];
  if (params.activeOnly) conditions.push("p.is_active = true");
  if (params.vertical) {
    sqlParams.push(params.vertical);
    conditions.push(`c.vertical = $${sqlParams.length}`);
  }
  if (params.categorySlug) {
    sqlParams.push(params.categorySlug);
    conditions.push(`c.slug = $${sqlParams.length}`);
  }
  if (params.q) {
    sqlParams.push(`%${params.q}%`);
    const i = sqlParams.length;
    conditions.push(
      `(p.name ILIKE $${i} OR p.sku ILIKE $${i} OR p.tags ILIKE $${i} OR p.brand ILIKE $${i})`
    );
  }
  const where = conditions.join(" AND ");
  const countRes = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM products p JOIN categories c ON c.id = p.category_id WHERE ${where}`,
    sqlParams
  );
  const total = Number(countRes.rows[0]?.count ?? 0);
  const offset = (params.page - 1) * params.pageSize;
  sqlParams.push(params.pageSize, offset);
  const { rows } = await query(
    `${productSelect} WHERE ${where} ORDER BY p.name ASC LIMIT $${sqlParams.length - 1} OFFSET $${sqlParams.length}`,
    sqlParams
  );
  const ids = rows.map((r) => r.id as string);
  const images = await loadImages(ids);
  const inv = await loadInventory(ids);
  const items = await Promise.all(
    rows.map((r) =>
      toProductDetail(r, images.get(r.id as string) ?? [], inv.get(r.id as string) ?? null)
    )
  );
  return { items, total };
}

export async function findProductById(id: string): Promise<Product | null> {
  const { rows } = await query(`SELECT * FROM products WHERE id = $1`, [id]);
  return rows[0] ? mapProduct(rows[0]) : null;
}

export async function listProductsAdmin() {
  const { rows } = await query(
    `${productSelect} ORDER BY p.name ASC`
  );
  const ids = rows.map((r) => r.id as string);
  const images = await loadImages(ids);
  const inv = await loadInventory(ids);
  return Promise.all(
    rows.map((r) =>
      toProductDetail(r, images.get(r.id as string) ?? [], inv.get(r.id as string) ?? null)
    )
  );
}

export async function createProduct(data: {
  sku: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  brand?: string | null;
  moq?: number;
  allowInstantCheckout?: boolean;
  quoteOnly?: boolean;
  isActive?: boolean;
  tags?: string | null;
}) {
  const id = crypto.randomUUID();
  const now = new Date();
  await query(
    `INSERT INTO products (id, sku, name, slug, description, category_id, brand, moq,
      allow_instant_checkout, quote_only, is_active, tags, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      id,
      data.sku,
      data.name,
      data.slug,
      data.description,
      data.categoryId,
      data.brand ?? null,
      data.moq ?? 1,
      data.allowInstantCheckout ?? true,
      data.quoteOnly ?? false,
      data.isActive ?? true,
      data.tags ?? null,
      now,
    ]
  );
  return findProductById(id);
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    categoryId: string;
    brand: string | null;
    moq: number;
    isActive: boolean;
  }>
) {
  const sets: string[] = ["updated_at = $2"];
  const params: unknown[] = [id, new Date()];
  if (data.name != null) {
    params.push(data.name);
    sets.push(`name = $${params.length}`);
  }
  if (data.description != null) {
    params.push(data.description);
    sets.push(`description = $${params.length}`);
  }
  if (data.categoryId != null) {
    params.push(data.categoryId);
    sets.push(`category_id = $${params.length}`);
  }
  if (data.brand !== undefined) {
    params.push(data.brand);
    sets.push(`brand = $${params.length}`);
  }
  if (data.moq != null) {
    params.push(data.moq);
    sets.push(`moq = $${params.length}`);
  }
  if (data.isActive != null) {
    params.push(data.isActive);
    sets.push(`is_active = $${params.length}`);
  }
  await query(`UPDATE products SET ${sets.join(", ")} WHERE id = $1`, params);
  return findProductDetail({ id });
}

export async function deactivateProduct(id: string) {
  await query(`UPDATE products SET is_active = false, updated_at = $2 WHERE id = $1`, [
    id,
    new Date(),
  ]);
}

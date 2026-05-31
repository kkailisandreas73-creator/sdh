import { newId } from "@/lib/db/id";
import { pool, query, type DbClient } from "@/lib/db/pool";
import { importConcurrency, runPool } from "@/lib/import/concurrency";

export const SUPERHOME_BASE = "https://superhome.com.cy";
export const SUPERHOME_HOME = `${SUPERHOME_BASE}/`;
export const PRODUCTS_PREFIX = "/english/products/";
export const SUPERHOME_PRICE_LIST_ID = "superhome-eur";

const USER_AGENT =
  "Mozilla/5.0 (compatible; SDH-Importer/1.0; +https://github.com/kkailisandreas73-creator/sdh)";

export type SuperhomeProductJson = {
  "@type"?: string;
  name?: string;
  sku?: string;
  mpn?: string;
  description?: string;
  image?: string | string[];
  brand?: { name?: string } | string;
  offers?: {
    url?: string;
    price?: number;
    priceCurrency?: string;
  };
};

export type ImportStats = {
  productsUpserted: number;
  productsFailed: number;
  productsSkipped: number;
  categoriesDone: number;
  categoriesFailed: number;
};

export function emptyStats(): ImportStats {
  return {
    productsUpserted: 0,
    productsFailed: 0,
    productsSkipped: 0,
    categoriesDone: 0,
    categoriesFailed: 0,
  };
}

export function mergeImportStats(into: ImportStats, from: ImportStats) {
  into.productsUpserted += from.productsUpserted;
  into.productsFailed += from.productsFailed;
  into.productsSkipped += from.productsSkipped;
  into.categoriesDone += from.categoriesDone;
  into.categoriesFailed += from.categoriesFailed;
}

export function titleCase(slug: string) {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Root category slug for the entire Superhome branch (stored in categories.vertical). */
export function verticalForPath(segments: string[]) {
  if (segments.length === 0) return "uncategorized";
  return categorySlugForPath([segments[0]]);
}

export function categorySlugForPath(segments: string[]) {
  return `sh-${segments.join("-")}`;
}

export function stripHtml(html: string) {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

export function normalizeCategoryPath(href: string): string[] | null {
  let path = href;
  if (path.startsWith("http")) {
    try {
      path = new URL(path).pathname;
    } catch {
      return null;
    }
  }
  if (!path.startsWith(PRODUCTS_PREFIX)) return null;
  const rest = path.slice(PRODUCTS_PREFIX.length).replace(/\/+$/, "");
  if (!rest || rest.includes("details")) return null;
  const segments = rest.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  return segments;
}

export function categoryUrlFromSegments(segments: string[]) {
  return `${SUPERHOME_BASE}/english/products/${segments.join("/")}`;
}

export function extractCategoryLinks(html: string): string[][] {
  const paths = new Set<string>();
  const re = /href="(\/english\/products\/[^"?#]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const segments = normalizeCategoryPath(m[1]);
    if (segments) paths.add(segments.join("/"));
  }
  return [...paths].map((p) => p.split("/"));
}

export function parsePagination(html: string) {
  const match = html.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
  if (!match) return 1;
  return Math.max(1, parseInt(match[2], 10));
}

export function parseProductsFromHtml(html: string): SuperhomeProductJson[] {
  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1].trim()) as {
        "@type"?: string;
        itemListElement?: { item?: SuperhomeProductJson }[];
      };
      if (data["@type"] === "ItemList" && Array.isArray(data.itemListElement)) {
        return data.itemListElement
          .map((el) => el?.item)
          .filter((item): item is SuperhomeProductJson => !!item && item["@type"] === "Product");
      }
    } catch {
      /* next block */
    }
  }
  return [];
}

export async function fetchSuperhomeHtml(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

export async function discoverCategoryPaths(): Promise<string[][]> {
  const html = await fetchSuperhomeHtml(SUPERHOME_HOME);
  const seen = new Set(extractCategoryLinks(html).map((s) => s.join("/")));
  const unique = [...seen].map((k) => k.split("/"));
  unique.sort((a, b) => a.length - b.length || a.join("/").localeCompare(b.join("/")));
  return unique;
}

export function dedupePaths(paths: string[][]): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const segments of paths) {
    const key = segments.join("/");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(segments);
  }
  return out;
}

export function leafCategoryPaths(all: string[][]) {
  const keys = new Set(all.map((s) => s.join("/")));
  return dedupePaths(
    all.filter((segments) => {
      const prefix = `${segments.join("/")}/`;
      for (const key of keys) {
        if (key.startsWith(prefix)) return false;
      }
      return true;
    })
  );
}

/** Every prefix path needed to build the category tree (unique, parents before children). */
export function allPrefixPaths(paths: string[][]): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const segments of paths) {
    for (let depth = 1; depth <= segments.length; depth++) {
      const prefix = segments.slice(0, depth);
      const key = prefix.join("/");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(prefix);
    }
  }
  return out.sort(
    (a, b) => a.length - b.length || a.join("/").localeCompare(b.join("/"))
  );
}

export async function ensureSuperhomePriceList(client: DbClient = pool) {
  await client.query(
    `INSERT INTO price_lists (id, name, currency, is_default)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, currency = EXCLUDED.currency`,
    [SUPERHOME_PRICE_LIST_ID, "Superhome Retail (EUR)", "EUR"]
  );
}

/** Build category rows once (sequential). Product workers only import distinct leaves. */
export async function upsertCategoryTree(
  allPaths: string[][],
  cache: Map<string, string>,
  client: DbClient = pool
) {
  const inflight = new Map<string, Promise<string>>();
  for (const segments of allPrefixPaths(allPaths)) {
    await upsertCategory(segments, cache, client, inflight);
  }
}

/** Resolve DB ids for leaf categories (tree must already exist). */
export async function loadLeafCategoryIds(
  leafPaths: string[][],
  client: DbClient = pool
): Promise<Map<string, string>> {
  const slugs = leafPaths.map((segments) => categorySlugForPath(segments));
  const { rows } = await client.query<{ slug: string; id: string }>(
    `SELECT slug, id FROM categories WHERE slug = ANY($1::text[])`,
    [slugs]
  );
  const bySlug = new Map(rows.map((r) => [r.slug, r.id]));
  const cache = new Map<string, string>();
  for (const segments of leafPaths) {
    const key = segments.join("/");
    const id = bySlug.get(categorySlugForPath(segments));
    if (!id) {
      throw new Error(`Category not found for leaf path ${key}`);
    }
    cache.set(key, id);
  }
  return cache;
}

export async function upsertCategory(
  segments: string[],
  cache: Map<string, string>,
  client: DbClient = pool,
  inflight: Map<string, Promise<string>> = new Map()
): Promise<string> {
  const key = segments.join("/");
  const cached = cache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const work = (async () => {
    let parentId: string | null = null;
    if (segments.length > 1) {
      parentId = await upsertCategory(segments.slice(0, -1), cache, client, inflight);
    }

    const slug = categorySlugForPath(segments);
    const name = titleCase(segments[segments.length - 1]);
    const vertical = verticalForPath(segments);
    const sortOrder = segments.length;

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO categories (id, slug, name, vertical, parent_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         vertical = EXCLUDED.vertical,
         parent_id = EXCLUDED.parent_id,
         sort_order = EXCLUDED.sort_order
       RETURNING id`,
      [newId(), slug, name, vertical, parentId, sortOrder]
    );
    const id = rows[0]?.id;
    if (!id) throw new Error(`Failed to upsert category ${slug}`);
    cache.set(key, id);
    return id;
  })();

  inflight.set(key, work);
  try {
    return await work;
  } finally {
    inflight.delete(key);
  }
}

export async function upsertSuperhomeProduct(
  product: SuperhomeProductJson,
  categoryId: string,
  categorySegments: string[],
  stats: ImportStats,
  client: DbClient = pool
) {
  const sku = String(product.sku ?? product.mpn ?? "").trim();
  if (!sku) {
    stats.productsSkipped++;
    return;
  }

  const name = String(product.name ?? sku).trim();
  const offer = product.offers ?? {};
  const detailUrl = typeof offer.url === "string" ? offer.url : "";
  const slugFromUrl = detailUrl.split("/").filter(Boolean).pop();
  const slug = slugFromUrl ? `sh-${slugFromUrl}` : `sh-${sku}`;
  const description = stripHtml(product.description ?? name);
  const brand =
    typeof product.brand === "object" && product.brand?.name
      ? String(product.brand.name)
      : typeof product.brand === "string"
        ? product.brand
        : null;
  const price = Number(offer.price);
  const images = Array.isArray(product.image)
    ? product.image.map((u) => String(u).trim()).filter(Boolean)
    : product.image
      ? [String(product.image)]
      : [];

  const metadata = JSON.stringify({
    source: "superhome.com.cy",
    sourceUrl: detailUrl,
    categoryPath: categorySegments.join("/"),
    currency: offer.priceCurrency ?? "EUR",
  });

  const now = new Date();
  let productId: string;

  const bySku = await client.query<{ id: string }>(`SELECT id FROM products WHERE sku = $1`, [
    sku,
  ]);
  if (bySku.rows[0]) {
    productId = bySku.rows[0].id;
    await client.query(
      `UPDATE products SET name = $2, slug = $3, description = $4, category_id = $5, brand = $6,
        metadata = $7, tags = $8, is_active = true, updated_at = $9 WHERE id = $1`,
      [
        productId,
        name,
        slug,
        description,
        categoryId,
        brand,
        metadata,
        `${name} ${sku} ${brand ?? ""}`.toLowerCase(),
        now,
      ]
    );
  } else {
    const bySlug = await client.query<{ id: string }>(`SELECT id FROM products WHERE slug = $1`, [
      slug,
    ]);
    if (bySlug.rows[0]) {
      productId = bySlug.rows[0].id;
      await client.query(
        `UPDATE products SET sku = $2, name = $3, description = $4, category_id = $5, brand = $6,
          metadata = $7, tags = $8, is_active = true, updated_at = $9 WHERE id = $1`,
        [
          productId,
          sku,
          name,
          description,
          categoryId,
          brand,
          metadata,
          `${name} ${sku} ${brand ?? ""}`.toLowerCase(),
          now,
        ]
      );
    } else {
      productId = newId();
      await client.query(
        `INSERT INTO products (id, sku, name, slug, description, category_id, brand, moq,
          allow_instant_checkout, quote_only, is_active, tags, metadata, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,1,true,false,true,$8,$9,$10)`,
        [
          productId,
          sku,
          name,
          slug,
          description,
          categoryId,
          brand,
          `${name} ${sku} ${brand ?? ""}`.toLowerCase(),
          metadata,
          now,
        ]
      );
    }
  }

  await client.query(`DELETE FROM product_images WHERE product_id = $1`, [productId]);
  for (let i = 0; i < images.length; i++) {
    await client.query(
      `INSERT INTO product_images (id, product_id, url, alt, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url, alt = EXCLUDED.alt, sort_order = EXCLUDED.sort_order`,
      [`sh-img-${sku}-${i}`, productId, images[i], name, i]
    );
  }

  await client.query(
    `INSERT INTO inventory (product_id, quantity_on_hand, reserved)
     VALUES ($1, 0, 0)
     ON CONFLICT (product_id) DO NOTHING`,
    [productId]
  );

  if (Number.isFinite(price) && price > 0) {
    for (const listId of [SUPERHOME_PRICE_LIST_ID, "default-price-list"]) {
      await client.query(
        `INSERT INTO price_tiers (id, price_list_id, product_id, min_qty, unit_price)
         VALUES ($1, $2, $3, 1, $4)
         ON CONFLICT (price_list_id, product_id, min_qty)
         DO UPDATE SET unit_price = EXCLUDED.unit_price`,
        [newId(), listId, productId, price]
      );
    }
  }

  stats.productsUpserted++;
}

async function upsertProductsFromListing(
  products: SuperhomeProductJson[],
  categoryId: string,
  categorySegments: string[],
  stats: ImportStats,
  client: DbClient = pool
) {
  const seen = new Set<string>();
  const unique: SuperhomeProductJson[] = [];
  for (const p of products) {
    const sku = String(p.sku ?? p.mpn ?? "").trim();
    if (!sku || seen.has(sku)) continue;
    seen.add(sku);
    unique.push(p);
  }
  if (unique.length === 0) return;

  const { products: concurrency } = importConcurrency();
  const parts = await runPool(unique, concurrency, async (p) => {
    const part = emptyStats();
    try {
      await upsertSuperhomeProduct(p, categoryId, categorySegments, part, client);
    } catch {
      part.productsFailed++;
    }
    return part;
  });
  for (const part of parts) mergeImportStats(stats, part);
}

export async function importOneListingPage(
  segments: string[],
  pageNum: number,
  cache: Map<string, string>,
  stats: ImportStats,
  client: DbClient = pool
): Promise<{ maxPage: number; productCount: number }> {
  const categoryId = await upsertCategory(segments, cache, client);
  const baseUrl = categoryUrlFromSegments(segments);
  const url = pageNum === 1 ? baseUrl : `${baseUrl}?PageNum=${pageNum}`;

  const html = await fetchSuperhomeHtml(url);
  const maxPage = parsePagination(html);
  const products = parseProductsFromHtml(html);
  await upsertProductsFromListing(products, categoryId, segments, stats, client);

  return { maxPage, productCount: products.length };
}

/** Import products for one leaf category (category row must already exist). */
export async function importLeafCategoryProducts(
  segments: string[],
  categoryId: string,
  stats: ImportStats,
  client: DbClient = pool
): Promise<{ maxPage: number }> {
  const baseUrl = categoryUrlFromSegments(segments);
  const { pages: pageConcurrency } = importConcurrency();

  const firstHtml = await fetchSuperhomeHtml(baseUrl);
  const maxPage = parsePagination(firstHtml);
  await upsertProductsFromListing(
    parseProductsFromHtml(firstHtml),
    categoryId,
    segments,
    stats,
    client
  );

  if (maxPage <= 1) return { maxPage };

  const otherPages = Array.from({ length: maxPage - 1 }, (_, i) => i + 2);
  await runPool(otherPages, pageConcurrency, async (pageNum) => {
    const html = await fetchSuperhomeHtml(`${baseUrl}?PageNum=${pageNum}`);
    await upsertProductsFromListing(
      parseProductsFromHtml(html),
      categoryId,
      segments,
      stats,
      client
    );
  });

  return { maxPage };
}

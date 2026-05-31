/**
 * One-time import from https://superhome.com.cy/
 * Crawls /english/products/* category pages (recursive), paginates with ?PageNum=N,
 * reads schema.org ItemList JSON-LD, upserts categories, products, images, and prices.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/import-superhome.mjs
 *   node scripts/import-superhome.mjs --dry-run --limit-categories 5
 *   node scripts/import-superhome.mjs --delay 400
 */
import crypto from "node:crypto";
import pg from "pg";

const BASE = "https://superhome.com.cy";
const HOME = `${BASE}/`;
const PRODUCTS_PREFIX = "/english/products/";
const PRICE_LIST_ID = "superhome-eur";
const USER_AGENT =
  "Mozilla/5.0 (compatible; SDH-Importer/1.0; +https://github.com/kkailisandreas73-creator/sdh)";

const VERTICAL_BY_ROOT = {
  "furniture-storage": "FURNITURE",
  "tools-equipment": "INDUSTRIAL",
};

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    limitCategories: 0,
    delayMs: 350,
    replaceSuperhome: false,
    deepDiscover: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--replace-superhome") opts.replaceSuperhome = true;
    else if (a === "--deep-discover") opts.deepDiscover = true;
    else if (a === "--limit-categories") opts.limitCategories = Number(argv[++i] ?? 0);
    else if (a === "--delay") opts.delayMs = Number(argv[++i] ?? 350);
  }
  return opts;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function newId() {
  return crypto.randomUUID();
}

function titleCase(slug) {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function verticalForPath(segments) {
  const root = segments[0] ?? "";
  return VERTICAL_BY_ROOT[root] ?? "DIY";
}

function categorySlugForPath(segments) {
  return `sh-${segments.join("-")}`;
}

function stripHtml(html) {
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

function normalizeCategoryPath(href) {
  if (!href) return null;
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

function categoryUrlFromSegments(segments) {
  return `${BASE}${PRODUCTS_PREFIX}${segments.join("/")}`;
}

function extractCategoryLinks(html) {
  const paths = new Set();
  const re = /href="(\/english\/products\/[^"?#]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const segments = normalizeCategoryPath(m[1]);
    if (segments) paths.add(segments.join("/"));
  }
  return [...paths].map((p) => p.split("/"));
}

function parsePagination(html) {
  const m = html.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
  if (!m) return 1;
  return Math.max(1, parseInt(m[2], 10));
}

function parseProductsFromHtml(html) {
  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1].trim());
      if (data["@type"] === "ItemList" && Array.isArray(data.itemListElement)) {
        return data.itemListElement
          .map((el) => el?.item)
          .filter((item) => item && item["@type"] === "Product");
      }
    } catch {
      /* try next block */
    }
  }
  return [];
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

async function discoverCategoryPaths(opts) {
  console.log("Discovering category URLs from homepage…");
  const html = await fetchHtml(HOME);
  await sleep(opts.delayMs);
  const seen = new Set(extractCategoryLinks(html).map((s) => s.join("/")));

  if (opts.deepDiscover) {
    console.log("Deep discovery: scanning category pages for extra links…");
    const queue = [...seen].map((k) => k.split("/"));
    for (let i = 0; i < queue.length; i++) {
      const segments = queue[i];
      const pathKey = segments.join("/");
      try {
        const pageHtml = await fetchHtml(categoryUrlFromSegments(segments));
        await sleep(opts.delayMs);
        for (const found of extractCategoryLinks(pageHtml)) {
          const key = found.join("/");
          if (!seen.has(key)) {
            seen.add(key);
            queue.push(found);
          }
        }
      } catch (e) {
        console.warn(`  skip discover ${pathKey}: ${e.message}`);
      }
    }
  }

  const unique = [...seen].map((k) => k.split("/"));
  unique.sort((a, b) => a.length - b.length || a.join("/").localeCompare(b.join("/")));
  return unique;
}

/** Parent category pages repeat products from children; import products on leaf URLs only. */
function leafCategoryPaths(all) {
  const keys = new Set(all.map((s) => s.join("/")));
  return all.filter((segments) => {
    const prefix = `${segments.join("/")}/`;
    for (const key of keys) {
      if (key.startsWith(prefix)) return false;
    }
    return true;
  });
}

async function ensurePriceList(client) {
  await client.query(
    `INSERT INTO price_lists (id, name, currency, is_default)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, currency = EXCLUDED.currency`,
    [PRICE_LIST_ID, "Superhome Retail (EUR)", "EUR"]
  );
}

async function upsertCategory(client, segments, cache) {
  const key = segments.join("/");
  if (cache.has(key)) return cache.get(key);

  let parentId = null;
  if (segments.length > 1) {
    parentId = await upsertCategory(client, segments.slice(0, -1), cache);
  }

  const slug = categorySlugForPath(segments);
  const name = titleCase(segments[segments.length - 1]);
  const vertical = verticalForPath(segments);
  const sortOrder = segments.length;

  const existing = await client.query(`SELECT id FROM categories WHERE slug = $1`, [slug]);
  let id = existing.rows[0]?.id;
  if (!id) {
    id = newId();
    await client.query(
      `INSERT INTO categories (id, slug, name, vertical, parent_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, slug, name, vertical, parentId, sortOrder]
    );
  } else {
    await client.query(
      `UPDATE categories SET name = $2, vertical = $3, parent_id = $4, sort_order = $5 WHERE id = $1`,
      [id, name, vertical, parentId, sortOrder]
    );
  }
  cache.set(key, id);
  return id;
}

async function upsertProduct(client, product, categoryId, categorySegments, opts) {
  const sku = String(product.sku ?? product.mpn ?? "").trim();
  if (!sku) return { skipped: true, reason: "no-sku" };

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

  if (opts.dryRun) {
    return { sku, name, price, images: images.length, dryRun: true };
  }

  const now = new Date();
  let productId;

  const bySku = await client.query(`SELECT id FROM products WHERE sku = $1`, [sku]);
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
    const bySlug = await client.query(`SELECT id FROM products WHERE slug = $1`, [slug]);
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
       VALUES ($1, $2, $3, $4, $5)`,
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
    for (const listId of [PRICE_LIST_ID, "default-price-list"]) {
      await client.query(
        `INSERT INTO price_tiers (id, price_list_id, product_id, min_qty, unit_price)
         VALUES ($1, $2, $3, 1, $4)
         ON CONFLICT (price_list_id, product_id, min_qty)
         DO UPDATE SET unit_price = EXCLUDED.unit_price`,
        [newId(), listId, productId, price]
      );
    }
  }

  return { sku, productId };
}

async function importCategory(client, segments, cache, stats, opts) {
  const pathKey = segments.join("/");
  const categoryId = await upsertCategory(client, segments, cache);
  const baseUrl = categoryUrlFromSegments(segments);

  let pageHtml;
  try {
    pageHtml = await fetchHtml(baseUrl);
  } catch (e) {
    console.warn(`  [${pathKey}] fetch failed: ${e.message}`);
    stats.categoriesFailed++;
    return;
  }
  await sleep(opts.delayMs);

  const maxPage = parsePagination(pageHtml);
  const seenSkus = new Set();

  for (let page = 1; page <= maxPage; page++) {
    const url = page === 1 ? baseUrl : `${baseUrl}?PageNum=${page}`;
    let html = page === 1 ? pageHtml : await fetchHtml(url);
    if (page > 1) await sleep(opts.delayMs);

    const products = parseProductsFromHtml(html);
    for (const p of products) {
      const sku = String(p.sku ?? "").trim();
      if (!sku || seenSkus.has(sku)) continue;
      seenSkus.add(sku);
      try {
        const result = await upsertProduct(client, p, categoryId, segments, opts);
        if (result.dryRun) stats.productsDryRun++;
        else stats.productsUpserted++;
      } catch (e) {
        stats.productsFailed++;
        console.warn(`  product ${sku}: ${e.message}`);
      }
    }

    if (page === 1 && maxPage > 1) {
      console.log(`  [${pathKey}] ${maxPage} pages, ${products.length} products on page 1`);
    }
  }

  stats.categoriesDone++;
  stats.productsInCategories += seenSkus.size;
}

async function replacePreviousSuperhome(client) {
  console.log("Removing previous Superhome import (metadata.source = superhome.com.cy)…");
  await client.query(
    `DELETE FROM products WHERE metadata::jsonb->>'source' = 'superhome.com.cy'`
  );
  await client.query(`DELETE FROM categories WHERE slug LIKE 'sh-%'`);
}

async function main() {
  const opts = parseArgs(process.argv);
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString && !opts.dryRun) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("Superhome import", opts.dryRun ? "(dry run)" : "", opts);

  const allPaths = await discoverCategoryPaths(opts);
  let categoryPaths = leafCategoryPaths(allPaths);
  console.log(
    `Found ${allPaths.length} category URLs (${categoryPaths.length} leaf paths for products).`
  );
  if (opts.limitCategories > 0) {
    categoryPaths = categoryPaths.slice(0, opts.limitCategories);
    console.log(`Limited to ${categoryPaths.length} leaf categories.`);
  }

  if (opts.dryRun) {
    const sample = categoryPaths[0];
    if (sample) {
      const html = await fetchHtml(categoryUrlFromSegments(sample));
      const products = parseProductsFromHtml(html);
      const pages = parsePagination(html);
      console.log("Sample:", sample.join("/"), `pages=${pages}`, `products=${products.length}`);
      if (products[0]) {
        console.log("First product:", products[0].sku, products[0].name, products[0].offers?.price);
      }
    }
    return;
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    if (opts.replaceSuperhome) await replacePreviousSuperhome(client);
    await ensurePriceList(client);

    const cache = new Map();
    const stats = {
      categoriesDone: 0,
      categoriesFailed: 0,
      productsUpserted: 0,
      productsFailed: 0,
      productsInCategories: 0,
    };

    for (const segments of allPaths) {
      await upsertCategory(client, segments, cache);
    }
    console.log(`Category tree: ${cache.size} nodes.`);

    for (let i = 0; i < categoryPaths.length; i++) {
      const segments = categoryPaths[i];
      console.log(`[${i + 1}/${categoryPaths.length}] ${segments.join("/")}`);
      try {
        await importCategory(client, segments, cache, stats, opts);
      } catch (e) {
        stats.categoriesFailed++;
        console.warn(`  category error: ${e.message}`);
      }
    }

    console.log("\nDone.", stats);
    console.log(`Price list: ${PRICE_LIST_ID} (EUR)`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

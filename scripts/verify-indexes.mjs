import pg from "pg";

const REQUIRED = [
  "categories_slug_key",
  "categories_parent_id_idx",
  "categories_parent_id_sort_order_idx",
  "categories_vertical_idx",
  "products_sku_key",
  "products_slug_key",
  "products_category_id_is_active_idx",
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

const { rows } = await client.query(
  `SELECT indexname FROM pg_indexes
   WHERE schemaname = 'public' AND indexname = ANY($1::text[])`,
  [REQUIRED]
);

const found = new Set(rows.map((r) => r.indexname));
const missing = REQUIRED.filter((name) => !found.has(name));

await client.end();

if (missing.length > 0) {
  console.error("Missing PostgreSQL indexes:");
  for (const name of missing) console.error(`  - ${name}`);
  process.exit(1);
}

console.log(`All ${REQUIRED.length} required indexes are present.`);

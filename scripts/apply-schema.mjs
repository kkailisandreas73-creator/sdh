import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_ID = "20260525180000_init_postgres";
const sqlPath = path.join(__dirname, "..", "db", "schema.sql");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");
const client = new pg.Client({ connectionString });

console.log("Applying database schema...");
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS "_sdh_migrations" (
    "id" TEXT PRIMARY KEY,
    "applied_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

const existing = await client.query(
  `SELECT 1 FROM "_sdh_migrations" WHERE "id" = $1`,
  [MIGRATION_ID]
);

if (existing.rowCount === 0) {
  await client.query(sql);
  await client.query(`INSERT INTO "_sdh_migrations" ("id") VALUES ($1)`, [
    MIGRATION_ID,
  ]);
  console.log(`Applied migration ${MIGRATION_ID}`);
} else {
  console.log(`Migration ${MIGRATION_ID} already applied`);
}

await client.query(`
  CREATE TABLE IF NOT EXISTS catalog_import_runs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'idle',
    phase TEXT,
    message TEXT,
    all_paths JSONB,
    leaf_paths JSONB,
    leaf_index INTEGER NOT NULL DEFAULT 0,
    page_num INTEGER NOT NULL DEFAULT 1,
    max_page INTEGER NOT NULL DEFAULT 1,
    stats JSONB NOT NULL DEFAULT '{}',
    error TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

await client.end();

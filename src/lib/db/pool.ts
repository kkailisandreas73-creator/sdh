import pg from "pg";
import { getPoolConfig } from "./connection";

const globalForPool = globalThis as unknown as { pgPool?: pg.Pool };

function createPool() {
  try {
    return new pg.Pool(getPoolConfig());
  } catch (e) {
    console.error("[db] Pool init failed:", e);
    throw e;
  }
}

export const pool = globalForPool.pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForPool.pgPool = pool;
}

export type DbClient = pg.Pool | pg.PoolClient;

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
  client: DbClient = pool
): Promise<pg.QueryResult<T>> {
  return client.query<T>(text, params);
}

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

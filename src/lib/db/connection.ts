import type { PoolConfig } from "pg";

/** pg does not accept Prisma-style ?schema=; Render Postgres needs SSL in production. */
export function getPoolConfig(): PoolConfig {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }

  let connectionString = raw;
  try {
    const url = new URL(raw);
    url.searchParams.delete("schema");
    connectionString = url.toString();
  } catch {
    connectionString = raw.replace(/[?&]schema=[^&]*/g, "").replace(/\?$/, "");
  }

  const poolMax = Math.max(
    10,
    Math.min(30, parseInt(process.env.PG_POOL_MAX ?? "20", 10) || 20)
  );

  const config: PoolConfig = {
    connectionString,
    max: poolMax,
  };

  const needsSsl =
    process.env.PGSSLMODE === "require" ||
    process.env.DATABASE_SSL === "true" ||
    /render\.com|sslmode=require/i.test(raw);

  if (needsSsl) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

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

  const config: PoolConfig = {
    connectionString,
    max: 10,
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

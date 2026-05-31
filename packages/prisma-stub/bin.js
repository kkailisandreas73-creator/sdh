#!/usr/bin/env node
/**
 * Replaces the Prisma CLI when Render still uses a legacy build command like:
 *   npm ci && npx prisma migrate deploy && npm run build && npx prisma db seed
 * Schema and migrations live in db/schema.sql — see scripts/apply-schema.mjs
 */
const args = process.argv.slice(2);

function ok(msg) {
  console.log(`[sdh] ${msg}`);
  process.exit(0);
}

if (args[0] === "migrate" && args[1] === "deploy") {
  ok("Skipped prisma migrate deploy (use db/schema.sql at container start).");
}

if (args[0] === "db" && args[1] === "seed") {
  ok("Skipped prisma db seed (use db/seed.ts at container start).");
}

if (args[0] === "generate") {
  ok("Skipped prisma generate (app uses plain SQL via pg).");
}

console.error(`[sdh-prisma-stub] Unknown: prisma ${args.join(" ")}`);
process.exit(1);

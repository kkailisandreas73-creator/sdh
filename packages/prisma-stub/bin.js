#!/usr/bin/env node
/**
 * Replaces the Prisma CLI in production installs. Real CLI for local dev:
 *   npx prisma@5.22.0 migrate dev
 */
const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);
const onRender = Boolean(
  process.env.RENDER || process.env.RENDER_SERVICE_ID
);
const allowDb = process.env.SDH_RUN_MIGRATIONS === "1";

function done(msg) {
  console.log(`[sdh-prisma-stub] ${msg}`);
  process.exit(0);
}

if (args[0] === "generate") {
  const result = spawnSync("npx", ["prisma@5.22.0", "generate"], {
    stdio: "inherit",
    shell: true,
  });
  process.exit(result.status ?? 1);
}

if (onRender && !allowDb) {
  if (args[0] === "migrate" && args[1] === "deploy") {
    done("Skipped migrate deploy — schema is applied at start via scripts/apply-schema.mjs.");
  }
  if (args[0] === "db" && args[1] === "seed") {
    done("Skipped db seed — seed runs at start via render-start.sh.");
  }
}

if (args[0] === "migrate" || args[0] === "db" || args[0] === "studio") {
  console.error(
    "[sdh-prisma-stub] Use npx prisma@5.22.0 for local development, not the production stub."
  );
  process.exit(1);
}

console.error(`[sdh-prisma-stub] Unknown command: prisma ${args.join(" ")}`);
process.exit(1);

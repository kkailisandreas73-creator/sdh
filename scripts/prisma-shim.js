/**
 * On Render, the default build command still runs `prisma migrate deploy` against an
 * unreachable private DB host. Skip migrate/seed unless SDH_RUN_MIGRATIONS=1 (start script).
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const args = process.argv.slice(2);
const onRender = Boolean(
  process.env.RENDER || process.env.RENDER_SERVICE_ID
);
const runMigrations = process.env.SDH_RUN_MIGRATIONS === "1";

function skip(message) {
  console.log(`[sdh] ${message}`);
  process.exit(0);
}

if (onRender && !runMigrations) {
  if (args[0] === "migrate" && args[1] === "deploy") {
    skip(
      "Skipping prisma migrate deploy during build (runs at start via render-start.sh)."
    );
  }
  if (args[0] === "db" && args[1] === "seed") {
    skip("Skipping prisma db seed during build (runs at start).");
  }
}

const prismaEntry = require.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaEntry, ...args], {
  stdio: "inherit",
  cwd: path.join(__dirname, ".."),
});

process.exit(result.status ?? 1);

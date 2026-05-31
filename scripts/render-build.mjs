import { spawnSync } from "node:child_process";

console.log(
  "\n=== SDH build: node scripts/render-build.mjs (no prisma migrate/seed) ===\n"
);

// Placeholder URL — build must never use Render's internal Postgres hostname.
process.env.DATABASE_URL =
  "postgresql://build:build@127.0.0.1:5432/build?schema=public";
process.env.RENDER_BUILD_SAFE = "1";

function run(command, args) {
  console.log(`\n==> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["ci"]);
run("npm", ["run", "build"]);

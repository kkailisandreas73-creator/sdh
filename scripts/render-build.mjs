import { spawnSync } from "node:child_process";

console.log("\n=== SDH build (no database) ===\n");

process.env.DATABASE_URL =
  "postgresql://build:build@127.0.0.1:5432/build?schema=public";

function run(command, args) {
  console.log(`\n==> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["ci"]);
run("npm", ["run", "build"]);

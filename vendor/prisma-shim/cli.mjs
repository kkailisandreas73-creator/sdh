#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [, , cmd, sub] = process.argv;

function run(command) {
  execSync(command, { cwd: root, stdio: "inherit", env: process.env });
}

if (cmd === "migrate" && sub === "deploy") {
  run("node scripts/apply-schema.mjs");
  run("npm run db:seed");
  process.exit(0);
}

if (cmd === "db" && sub === "seed") {
  run("npm run db:seed");
  process.exit(0);
}

console.error("prisma shim: unsupported command:", process.argv.slice(2).join(" "));
process.exit(1);

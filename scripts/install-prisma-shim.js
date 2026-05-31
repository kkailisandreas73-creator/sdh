/**
 * Replace node_modules/.bin/prisma on Render so legacy build commands that run
 * `npx prisma migrate deploy` during build become no-ops (real run at start).
 */
const fs = require("node:fs");
const path = require("node:path");

const onRender = Boolean(
  process.env.RENDER || process.env.RENDER_SERVICE_ID
);
if (!onRender) {
  process.exit(0);
}

const binPath = path.join(__dirname, "..", "node_modules", ".bin", "prisma");
const shimPath = path.join(__dirname, "prisma-shim.js");

const launcher = `#!/usr/bin/env node
require(${JSON.stringify(shimPath)});
`;

fs.writeFileSync(binPath, launcher, { mode: 0o755 });
console.log("[sdh] Installed Prisma CLI shim for Render build (migrate/seed run at start).");

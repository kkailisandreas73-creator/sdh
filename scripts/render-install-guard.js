/**
 * Render injects the internal Postgres DATABASE_URL during build, but the build
 * environment cannot reach that host. Fail fast with a clear fix if someone
 * runs npm ci/install without scripts/render-build.sh masking the URL first.
 */
const url = process.env.DATABASE_URL ?? "";
const onRender = Boolean(
  process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.RENDER_EXTERNAL_URL
);
const looksLikeRenderPostgres =
  url.includes("dpg-") || (url.includes("render.com") && url.startsWith("postgres"));

if (onRender && looksLikeRenderPostgres && process.env.RENDER_BUILD_SAFE !== "1") {
  console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  Render build misconfiguration — database must not run here     ║
╚══════════════════════════════════════════════════════════════════╝

Your Build Command is still running npm/prisma against the live DATABASE_URL.
The private host (dpg-...) is only reachable when the app STARTS in Oregon.

In Render Dashboard → sdh-web → Settings, set EXACTLY:

  Build Command:  npm run build:render
  Start Command:  sh scripts/render-start.sh
  Region:         Oregon

Remove any "prisma migrate" or "prisma db seed" from the build command.
Then Manual Deploy latest main.
`);
  process.exit(1);
}

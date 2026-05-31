# Render deploy — fix build command

If your deploy log shows:

```text
Running build command 'npm ci && npx prisma migrate deploy && npm run build && npx prisma db seed'...
```

Render is **not** using this repo’s `render.yaml`. That command used to fail with `P1001`.

**Note:** Recent commits install a Prisma shim on Render so the legacy build command skips `migrate deploy` / `db seed` during build and runs them at start. You should still update the build command when possible.

## Fix (choose one)

### A) Edit the web service (fastest)

1. Open [Render Dashboard](https://dashboard.render.com) → **sdh-web** (not the database).
2. **Settings** → scroll to **Build & Deploy**.
3. **Build Command** — delete everything, paste exactly:

   ```bash
   node scripts/render-build.mjs
   ```

4. **Start Command**:

   ```bash
   sh scripts/render-start.sh
   ```

5. **Region**: **Oregon** (same region as Postgres).
6. **Save Changes**.
7. **Manual Deploy** → Deploy latest commit.

### B) Sync Blueprint from GitHub

1. Dashboard → **Blueprints** → your `sdh` blueprint.
2. **Manual Sync** (or **Sync**).
3. Confirm **sdh-web** `buildCommand` is `node scripts/render-build.mjs`.
4. Deploy.

## Success check

The next log must include:

```text
Running build command 'node scripts/render-build.mjs'...
=== SDH build: node scripts/render-build.mjs (no prisma migrate/seed) ===
```

It must **not** contain `npx prisma migrate deploy` during the build.

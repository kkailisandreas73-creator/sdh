# Render deploy

## Build command

Render may still use the legacy command:

```bash
npm ci && npx prisma migrate deploy && npm run build && npx prisma db seed
```

That is OK now. The `prisma` npm package in this repo is a **stub** that skips `migrate deploy` and `db seed` during build (no database connection).

You should see in the build log:

```text
[sdh-prisma-stub] Skipped migrate deploy — schema is applied at start via scripts/apply-schema.mjs.
```

## Start command

Must be:

```bash
sh scripts/render-start.sh
```

This runs:

1. `node scripts/apply-schema.mjs` — applies SQL with the `pg` driver (no Prisma CLI)
2. `npx tsx prisma/seed.ts` — demo data
3. `npm run start`

## Region

**Oregon** (same as Postgres).

## Optional cleaner build command

```bash
npm ci && npm run build
```

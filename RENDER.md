# Deploy on Render (no Prisma)

This project uses **PostgreSQL + plain SQL** (`pg`). There is no Prisma in the repo.

If your deploy log still shows:

```text
Running build command 'npm ci && npx prisma migrate deploy && npm run build && npx prisma db seed'
```

the Render **web service** was created with old settings. Fix it by **recreating from the Blueprint** (recommended) or editing settings manually.

## Option A — Recreate from Blueprint (recommended)

1. In [Render Dashboard](https://dashboard.render.com), note your Postgres **Internal Database URL** (or keep the existing `sdh-db` instance).
2. **Delete** the web service `sdh-web` only (you can keep the database).
3. **New → Blueprint** → connect repo `kkailisandreas73-creator/sdh` → branch `main`.
4. **Apply** the blueprint from [`render.yaml`](render.yaml).
5. Confirm **sdh-web** settings:
   - **Region:** Oregon (same as Postgres)
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `sh scripts/render-start.sh`
6. Deploy. Build log must show `Running build command 'npm ci && npm run build'` — **no** `prisma`.

## Option B — Edit existing service

**sdh-web → Settings → Build & Deploy**

| Field | Value |
|-------|--------|
| Build Command | `npm ci && npm run build` |
| Start Command | `sh scripts/render-start.sh` |
| Region | Oregon |

Save, then **Manual Deploy** latest `main`.

## What happens at start

`scripts/render-start.sh` runs:

1. `node scripts/apply-schema.mjs` — applies `db/schema.sql`
2. `npx tsx db/seed.ts` — demo users/products
3. `npm run start` — Next.js

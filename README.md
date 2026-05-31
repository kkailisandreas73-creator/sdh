# Super Discount Wholesale

B2B wholesale e-commerce for **industrial**, **DIY**, and **furniture** products.

## Features

- Public catalog with **login-gated pricing**
- B2B registration and **admin approval**
- **Hybrid checkout**: instant purchase (in-stock) + **quote/RFQ**
- Volume tier pricing and NET-30 terms (demo buyer)
- Admin: accounts, products, inventory, quotes, orders, pricing

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- Prisma 5 + SQLite (local dev; switch to PostgreSQL for production)
- NextAuth.js v5 (credentials)
- Stripe (optional; dev mode completes orders without keys)

## Quick start

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@superdiscountwholesale.com | admin123 |
| Buyer (approved, NET30) | buyer@demo.com | buyer123 |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run db:seed` | Reseed database |

## Deploy on Render (free tier)

1. Push this repo to GitHub.
2. In [Render](https://render.com): **New → Blueprint**.
3. Connect repo `sdh` — Render reads [`render.yaml`](render.yaml) and creates:
   - **Web Service** (`sdh-web`, free)
   - **PostgreSQL** (`sdh-db`, free — expires after 90 days on free plan; upgrade for production)
4. Wait for deploy (~5–10 min). First deploy runs migrations + seed (demo users).
5. Open your app URL (`https://sdh-web-xxxx.onrender.com`). `NEXTAUTH_URL` is set automatically from `RENDER_EXTERNAL_URL`.

**If deploy fails with `P1001: Can't reach database server`:**

1. **Web service region** must be **Oregon** (same as Postgres). `render.yaml` does not move an existing service — change it under **Settings → Region**.
2. **Build Command** must be **only** `sh scripts/render-build.sh` (not `npm ci && npx prisma migrate deploy ...`).
3. **Start Command** must be `sh scripts/render-start.sh` (migrations run when the app starts).
4. **Environment → `DATABASE_URL`** must use the **Internal** URL from your Oregon Postgres instance.
5. **Blueprint → Sync** (if you used a blueprint) so dashboard settings match `render.yaml`.

**Manual Web Service** (if not using Blueprint):

| Setting | Value |
|---------|--------|
| Type | Web Service |
| Region | **Oregon** (must match Postgres region for internal `DATABASE_URL`) |
| Build | `sh scripts/render-build.sh` |
| Start | `sh scripts/render-start.sh` |
| Publish Directory | *(leave empty — not for Next.js server apps)* |

Link a Render Postgres instance and set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`.

**Free tier notes:** Service sleeps after ~15 min idle (cold start ~30s). Use **Web Service**, not Static Site.

## Production (other hosts)

1. PostgreSQL `DATABASE_URL` (included in Render blueprint).
2. `AUTH_SECRET` / `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (public app URL).
3. Configure Stripe keys and webhook (`/api/v1/webhooks/stripe`).

## API

REST API under `/api/v1` — see execution plan for full contract.

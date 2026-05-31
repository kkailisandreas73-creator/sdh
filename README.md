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
- PostgreSQL with **plain SQL** via `pg` ([`src/lib/db/repos`](src/lib/db/repos))
- NextAuth.js v5 (credentials)
- Stripe (optional; dev mode completes orders without keys)

## Quick start

Requires PostgreSQL (local Docker, Render, or cloud).

```bash
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL to your Postgres connection string

npm run db:schema
npm run db:seed
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
| `npm run db:schema` | Apply [`db/schema.sql`](db/schema.sql) |
| `npm run db:seed` | Load demo data |

## Deploy on Render (free tier)

1. Push this repo to GitHub.
2. In [Render](https://render.com): **New → Blueprint**.
3. Connect repo `sdh` — Render reads [`render.yaml`](render.yaml).
4. **Web service region: Oregon** (same as Postgres).
5. **Build:** `npm ci && npm run build`
6. **Start:** `sh scripts/render-start.sh` (applies schema + seed, then starts the app)

**Free tier notes:** Service sleeps after ~15 min idle. Postgres free tier expires after 90 days.

## API

REST API under `/api/v1` — see execution plan for full contract.

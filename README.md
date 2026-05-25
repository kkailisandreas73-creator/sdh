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

## Production

1. Set `DATABASE_URL` to PostgreSQL and change `provider` in `prisma/schema.prisma`.
2. Set `AUTH_SECRET` / `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
3. Configure Stripe keys and webhook (`/api/v1/webhooks/stripe`).
4. Deploy to Vercel or Docker.

## API

REST API under `/api/v1` — see execution plan for full contract.

#!/bin/sh
set -e

export NEXTAUTH_URL="${RENDER_EXTERNAL_URL}"

echo "Applying schema..."
node scripts/apply-schema.mjs

echo "Seeding database..."
npx tsx db/seed.ts

exec npm run start

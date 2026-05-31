#!/bin/sh
set -e

export NEXTAUTH_URL="${RENDER_EXTERNAL_URL}"

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database (idempotent upserts)..."
npx prisma db seed

exec npm run start

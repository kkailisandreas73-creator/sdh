#!/bin/sh
set -e

# Render's build environment cannot reach the Postgres private hostname.
# Use a placeholder so Prisma/Next never connect to the real DB during build.
export DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"

echo "==> Installing dependencies..."
npm ci

echo "==> Building Next.js (no database access)..."
npm run build

#!/bin/sh
set -e

echo "Applying database migrations…"
npx prisma migrate deploy

echo "Starting Open Patient Pay…"
exec node node_modules/next/dist/bin/next start

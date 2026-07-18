#!/bin/sh
set -e

# ---------------------------------------------------------------------------
# Learnault API — Container Entrypoint
#
# Environment variables:
#   RUN_MIGRATIONS  = "true"  → run `prisma migrate deploy` before starting
#   PORT            → listen port (default 5000)
# ---------------------------------------------------------------------------

if [ "${RUN_MIGRATIONS}" = "true" ]; then
  echo "[entrypoint] Running database migrations …"
  npx prisma migrate deploy
  echo "[entrypoint] Migrations applied."
fi

PORT="${PORT:-5000}"
echo "[entrypoint] Starting API server on port ${PORT} …"
exec node dist/server.js

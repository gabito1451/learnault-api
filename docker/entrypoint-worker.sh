#!/bin/sh
set -e

# ---------------------------------------------------------------------------
# Learnault Worker — Container Entrypoint
#
# Environment variables:
#   RUN_MIGRATIONS  = "true"  → run `prisma migrate deploy` before starting
#   WORKER_SCRIPT   → path to worker entry point (required)
# ---------------------------------------------------------------------------

if [ "${RUN_MIGRATIONS}" = "true" ]; then
  echo "[entrypoint] Running database migrations …"
  npx prisma migrate deploy
  echo "[entrypoint] Migrations applied."
fi

if [ -z "${WORKER_SCRIPT}" ]; then
  echo "[entrypoint] ERROR: WORKER_SCRIPT environment variable is not set." >&2
  echo "[entrypoint] Set WORKER_SCRIPT to the path of your worker entry point." >&2
  exit 1
fi

echo "[entrypoint] Starting worker: ${WORKER_SCRIPT} …"
exec node "${WORKER_SCRIPT}"

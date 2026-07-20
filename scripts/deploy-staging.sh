#!/bin/bash
set -e

echo "Starting Staging Deployment..."

# Validate configuration
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set."
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo "Error: JWT_SECRET is not set."
  exit 1
fi

IMAGE_TAG=${1:-staging}
echo "Deploying image learnault-api:$IMAGE_TAG"

# Run safe Prisma migrations
# Use the same image to ensure Prisma CLI matches the schema
echo "Running database migrations..."
docker run --rm \
  --network host \
  -e DATABASE_URL="$DATABASE_URL" \
  learnault-api:$IMAGE_TAG \
  npx prisma migrate deploy

# Deploy immutable image
echo "Deploying application containers..."
export IMAGE_TAG
docker compose -f docker-compose.staging.yml up -d

echo "Awaiting readiness..."
# Wait for health endpoint
MAX_RETRIES=15
RETRY_COUNT=0
HEALTH_URL="http://localhost:5000/health"

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s $HEALTH_URL | grep '"status":"ok"'; then
    echo ""
    echo "Application is ready!"
    exit 0
  fi
  echo "Waiting for app to be ready... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT+1))
done

echo "Application failed to become ready in time."
docker compose -f docker-compose.staging.yml logs api
exit 1

#!/bin/bash
set -e

PREVIOUS_IMAGE_TAG=$1

if [ -z "$PREVIOUS_IMAGE_TAG" ]; then
  echo "Error: PREVIOUS_IMAGE_TAG must be provided for rollback."
  echo "Usage: ./rollback-staging.sh <previous_tag>"
  exit 1
fi

echo "Initiating Rollback to image tag: $PREVIOUS_IMAGE_TAG"
echo "Note: This uses a migration-forward policy. Database is NOT rolled back."

# Deploy previous image
export IMAGE_TAG=$PREVIOUS_IMAGE_TAG
docker compose -f docker-compose.staging.yml up -d

echo "Awaiting readiness after rollback..."
# Wait for health endpoint
MAX_RETRIES=15
RETRY_COUNT=0
HEALTH_URL="http://localhost:5000/health"

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s $HEALTH_URL | grep '"status":"ok"'; then
    echo ""
    echo "Rollback successful. Application is ready!"
    exit 0
  fi
  echo "Waiting for app to be ready... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT+1))
done

echo "Rollback application failed to become ready in time."
docker compose -f docker-compose.staging.yml logs api
exit 1

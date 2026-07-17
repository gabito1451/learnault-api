#!/bin/bash
set -e

echo "Running Smoke Tests on Staging..."

API_URL="http://localhost:5000"

echo "Testing /health endpoint..."
curl -s -f "$API_URL/health" || { echo "Health check failed!"; exit 1; }

echo ""
echo "Smoke tests passed successfully!"

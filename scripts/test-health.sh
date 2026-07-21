#!/bin/bash

# Script to test health endpoints and request correlation
# Usage: ./scripts/test-health.sh [BASE_URL]

BASE_URL="${1:-http://localhost:5000}"

echo "================================"
echo "Testing Health Endpoints"
echo "================================"
echo

echo "1. Testing Liveness Endpoint (GET /health/live)"
echo "------------------------------------------------"
curl -i "$BASE_URL/health/live"
echo
echo

echo "2. Testing Readiness Endpoint (GET /health/ready)"
echo "------------------------------------------------"
curl -i "$BASE_URL/health/ready"
echo
echo

echo "3. Testing Request ID Propagation"
echo "----------------------------------"
echo "Sending request with custom x-request-id header..."
curl -i -H "x-request-id: custom-test-id-12345" "$BASE_URL/health/live"
echo
echo

echo "4. Testing Request ID Generation"
echo "--------------------------------"
echo "Sending request without x-request-id header (should generate one)..."
curl -i "$BASE_URL/health/live"
echo
echo

echo "================================"
echo "Testing Complete"
echo "================================"

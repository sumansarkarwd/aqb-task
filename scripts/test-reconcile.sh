#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "POST /api/v1/reconcile"
curl -sS -X POST "${BASE_URL}/api/v1/reconcile" \
  -H 'Content-Type: application/json' \
  -d @fixtures/sample-reconcile-request.json | jq .

echo ""
echo "GET /api/v1/reconcile"
curl -sS "${BASE_URL}/api/v1/reconcile" | jq .

#!/usr/bin/env bash
# Create the first administrator account on the live AIP backend.
#
# Usage:
#   EMAIL="you@example.com" PASSWORD="strong-password" FULL_NAME="Your Name" \
#     ./scripts/create-admin.sh
#
# Optional:
#   API_URL  (default: https://author-production.up.railway.app)
set -euo pipefail

API_URL="${API_URL:-https://author-production.up.railway.app}"
EMAIL="${EMAIL:?Set EMAIL}"
PASSWORD="${PASSWORD:?Set PASSWORD}"
FULL_NAME="${FULL_NAME:-Administrator}"

echo "Registering admin ${EMAIL} at ${API_URL} ..."
curl -sS -X POST "${API_URL}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"full_name\":\"${FULL_NAME}\",\"role\":\"administrator\"}"
echo

echo "Verifying login ..."
curl -sS -X POST "${API_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
echo
echo "Done."

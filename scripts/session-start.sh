#!/bin/bash
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# Skip in local sessions — dev machine manages its own deps/env.
if [ "${CLAUDE_CODE_REMOTE:-false}" != "true" ]; then
  exit 0
fi

pnpm install --frozen-lockfile --prefer-offline

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  ADMIN_SECRET_VALUE=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
  AUTH_COOKIE_SECRET_VALUE=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  sed -i "s|^ADMIN_SECRET=.*|ADMIN_SECRET=${ADMIN_SECRET_VALUE}|" .env.local
  sed -i "s|^AUTH_COOKIE_SECRET=.*|AUTH_COOKIE_SECRET=${AUTH_COOKIE_SECRET_VALUE}|" .env.local
fi

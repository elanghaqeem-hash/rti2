#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker-compose.production.yml"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is not available."

if [ ! -f .env.production ]; then
  cp .env.production.example .env.production
  chmod 600 .env.production
  fail ".env.production was created from the template. Fill the required secrets, then rerun this script."
fi

required_vars=(ADMIN_USERNAME ADMIN_PASSWORD ADMIN_SESSION_SECRET RATE_LIMIT_SALT)
for key in "${required_vars[@]}"; do
  value="$(grep -E "^${key}=" .env.production | tail -n1 | cut -d= -f2- || true)"
  [ -n "$value" ] || fail "Required variable ${key} is empty in .env.production."
done

mkdir -p backups
chmod 700 backups
chmod 600 .env.production

$COMPOSE config >/dev/null
$COMPOSE build --pull
$COMPOSE up -d

echo
echo "RTI production containers started."
echo "Check: $COMPOSE ps"
echo "Health: https://risetin.co.id/api/health"
echo "Admin:  https://risetin.co.id/admin-access"
echo
echo "After first login, open /admin/system and apply pending migrations if the production database is new."

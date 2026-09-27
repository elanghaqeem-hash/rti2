#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker-compose.production.yml"
mkdir -p backups
chmod 700 backups

stamp="$(date +%Y%m%d-%H%M%S)"
name="rti-${stamp}.sqlite"

$COMPOSE exec -T app sh -lc 'sqlite3 "$RTI_DB_PATH" "PRAGMA wal_checkpoint(TRUNCATE);"'
$COMPOSE exec -T -e BACKUP_NAME="$name" app sh -lc 'sqlite3 "$RTI_DB_PATH" ".backup /backups/$BACKUP_NAME"'

sha256sum "backups/$name" > "backups/$name.sha256"
find backups -type f -name 'rti-*.sqlite' -mtime +30 -delete
find backups -type f -name 'rti-*.sqlite.sha256' -mtime +30 -delete

echo "Backup created: backups/$name"

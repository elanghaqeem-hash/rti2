#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker-compose.production.yml"

[ "$#" -eq 1 ] || {
  echo "Usage: $0 backups/rti-YYYYMMDD-HHMMSS.sqlite" >&2
  exit 1
}

source_file="$1"
[ -f "$source_file" ] || {
  echo "Backup file not found: $source_file" >&2
  exit 1
}

name="$(basename "$source_file")"
case "$name" in
  rti-*.sqlite) ;;
  *) echo "Unexpected backup filename: $name" >&2; exit 1 ;;
esac

if [ -f "$source_file.sha256" ]; then
  sha256sum -c "$source_file.sha256"
fi

$COMPOSE stop app
$COMPOSE run --rm --no-deps -e RESTORE_NAME="$name" app sh -lc '
  cp "/backups/$RESTORE_NAME" "$RTI_DB_PATH"
  rm -f "$RTI_DB_PATH-wal" "$RTI_DB_PATH-shm"
'
$COMPOSE up -d app

echo "Database restored from: $source_file"

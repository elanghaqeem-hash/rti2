#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';

function usage(exitCode = 0) {
  console.log(`
RTI database migration CLI

Usage:
  node scripts/db-migrate.mjs status [--db /path/to/rti.sqlite]
  node scripts/db-migrate.mjs up     [--db /path/to/rti.sqlite]
  node scripts/db-migrate.mjs verify [--db /path/to/rti.sqlite]
  node scripts/db-migrate.mjs list

Environment:
  RTI_DB_PATH   Absolute SQLite database path for production.
`);
  process.exit(exitCode);
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return '';
  return String(process.argv[index + 1] || '').trim();
}

function resolveDatabasePath() {
  const configured = argValue('--db') || String(process.env.RTI_DB_PATH || '').trim();
  if (configured) return path.resolve(configured);

  if (process.env.NODE_ENV === 'production') {
    throw new Error('RTI_DB_PATH (or --db) is required in production.');
  }

  return path.join(process.cwd(), 'data', 'rti.sqlite');
}

function migrationFiles() {
  const directory = path.join(process.cwd(), 'migrations');
  if (!fs.existsSync(directory)) {
    throw new Error(`Migration directory not found: ${directory}`);
  }

  return fs
    .readdirSync(directory)
    .filter((name) => /^\d{4}_[a-z0-9_\-]+\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b));
}

function openDatabase(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 10000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  return db;
}

function readApplied(db) {
  return new Set(
    db.prepare('SELECT name FROM schema_migrations ORDER BY name').all().map((row) => row.name),
  );
}

function status(db, databasePath) {
  const files = migrationFiles();
  const applied = readApplied(db);
  const pending = files.filter((name) => !applied.has(name));

  return {
    database: databasePath,
    connected: true,
    migrationCount: files.length,
    applied: files.filter((name) => applied.has(name)),
    pending,
  };
}

function applyPending(db, databasePath) {
  const directory = path.join(process.cwd(), 'migrations');
  const files = migrationFiles();
  const applied = readApplied(db);

  for (const name of files) {
    if (applied.has(name)) continue;

    const sql = fs.readFileSync(path.join(directory, name), 'utf8');
    process.stdout.write(`Applying ${name} ... `);

    db.exec('BEGIN IMMEDIATE;');
    try {
      db.exec(sql);
      db.prepare(
        'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
      ).run(name, new Date().toISOString());
      db.exec('COMMIT;');
      console.log('done');
    } catch (error) {
      try {
        db.exec('ROLLBACK;');
      } catch {
        // Preserve the original migration error.
      }
      console.log('failed');
      throw error;
    }
  }

  return status(db, databasePath);
}

function verify(db, databasePath) {
  const integrity = db.prepare('PRAGMA integrity_check;').get();
  const result = status(db, databasePath);
  const ok = String(integrity?.integrity_check || '').toLowerCase() === 'ok';

  return {
    ...result,
    integrity: ok ? 'ok' : String(integrity?.integrity_check || 'unknown'),
    ready: ok && result.pending.length === 0,
  };
}

const command = String(process.argv[2] || 'status').toLowerCase();
if (['-h', '--help', 'help'].includes(command)) usage(0);

if (command === 'list') {
  console.log(JSON.stringify({ migrations: migrationFiles() }, null, 2));
  process.exit(0);
}

if (!['status', 'up', 'verify'].includes(command)) usage(1);

let db;
try {
  const databasePath = resolveDatabasePath();
  db = openDatabase(databasePath);

  const result =
    command === 'up'
      ? applyPending(db, databasePath)
      : command === 'verify'
        ? verify(db, databasePath)
        : status(db, databasePath);

  console.log(JSON.stringify(result, null, 2));

  if (command === 'verify' && !result.ready) process.exitCode = 2;
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  try {
    db?.close();
  } catch {
    // Ignore close errors after reporting the primary result.
  }
}

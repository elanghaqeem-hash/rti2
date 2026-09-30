#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : '';
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function usage(exitCode = 0) {
  console.log(`
RTI restore CLI

Usage:
  node scripts/restore.mjs --from /backup/rti-backup-... --confirm [--with-uploads]

Safety:
  Stop the RTI application before restore.
  --confirm is mandatory.
  The current database is preserved as a pre-restore copy.
`);
  process.exit(exitCode);
}

if (hasFlag('--help') || hasFlag('-h')) usage(0);
if (!hasFlag('--confirm')) {
  console.error('Restore refused: stop the application and pass --confirm.');
  usage(2);
}

const backupDir = path.resolve(argValue('--from') || '');
if (!argValue('--from')) usage(2);

const dbPath = path.resolve(
  String(process.env.RTI_DB_PATH || '').trim() ||
    (process.env.NODE_ENV === 'production' ? '' : path.join(process.cwd(), 'data', 'rti.sqlite')),
);

if (!dbPath || (process.env.NODE_ENV === 'production' && !process.env.RTI_DB_PATH)) {
  throw new Error('RTI_DB_PATH is required in production.');
}

const manifestPath = path.join(backupDir, 'manifest.json');
const sourceDb = path.join(backupDir, 'database.sqlite');

try {
  if (!fs.existsSync(manifestPath) || !fs.existsSync(sourceDb)) {
    throw new Error('Backup manifest or database.sqlite is missing.');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.format !== 'rti-universal-backup-v1') {
    throw new Error('Unsupported RTI backup format.');
  }

  if (manifest.database?.sha256) {
    const actualSha256 = createHash('sha256')
      .update(fs.readFileSync(sourceDb))
      .digest('hex');
    if (actualSha256 !== manifest.database.sha256) {
      throw new Error('Backup database SHA-256 checksum mismatch.');
    }
  }

  const candidate = new DatabaseSync(sourceDb, { readOnly: true });
  const integrity = candidate.prepare('PRAGMA integrity_check;').get();
  candidate.close();

  if (String(integrity?.integrity_check || '').toLowerCase() !== 'ok') {
    throw new Error('Backup database integrity_check failed.');
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  let preservedCurrent = null;
  if (fs.existsSync(dbPath)) {
    preservedCurrent =
      dbPath +
      '.pre-restore-' +
      new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    fs.copyFileSync(dbPath, preservedCurrent);
    fs.chmodSync(preservedCurrent, 0o600);
  }

  const tempDb = dbPath + '.restore.tmp';
  fs.copyFileSync(sourceDb, tempDb);
  fs.chmodSync(tempDb, 0o600);
  fs.renameSync(tempDb, dbPath);

  for (const suffix of ['-wal', '-shm']) {
    fs.rmSync(dbPath + suffix, { force: true });
  }

  let uploadsRestored = false;
  if (hasFlag('--with-uploads')) {
    const uploadDir = String(process.env.RTI_UPLOAD_DIR || '').trim();
    if (!uploadDir) throw new Error('RTI_UPLOAD_DIR is required for --with-uploads.');

    const sourceUploads = path.join(backupDir, 'uploads');
    if (!fs.existsSync(sourceUploads)) {
      throw new Error('This backup does not contain uploads.');
    }

    const targetUploads = path.resolve(uploadDir);
    const preservedUploads =
      targetUploads +
      '.pre-restore-' +
      new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    if (fs.existsSync(preservedUploads)) {
      throw new Error(`Refusing to overwrite existing preserved uploads: ${preservedUploads}`);
    }

    if (fs.existsSync(targetUploads)) fs.renameSync(targetUploads, preservedUploads);
    fs.cpSync(sourceUploads, targetUploads, { recursive: true, force: false });
    uploadsRestored = true;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        restoredFrom: backupDir,
        database: dbPath,
        preservedCurrent,
        uploadsRestored,
        nextStep: 'Run: node scripts/db-migrate.mjs verify, then start the RTI application.',
      },
      null,
      2,
    ),
  );
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
}

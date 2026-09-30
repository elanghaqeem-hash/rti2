#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function requiredPath(name, fallback = '') {
  const value = String(process.env[name] || fallback).trim();
  if (!value) throw new Error(`${name} is required.`);
  return path.resolve(value);
}

function sqlString(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}

function cleanupOldBackups(root, retentionDays) {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;
  const cutoff = Date.now() - retentionDays * 86400000;

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('rti-backup-')) continue;
    const target = path.join(root, entry.name);
    const stat = fs.statSync(target);
    if (stat.mtimeMs < cutoff) fs.rmSync(target, { recursive: true, force: true });
  }
}

let sourceDb;
try {
  sourceDb = requiredPath(
    'RTI_DB_PATH',
    process.env.NODE_ENV === 'production' ? '' : path.join(process.cwd(), 'data', 'rti.sqlite'),
  );

  if (!fs.existsSync(sourceDb)) {
    throw new Error(`Database file does not exist: ${sourceDb}`);
  }

  const backupRoot = requiredPath(
    'RTI_BACKUP_DIR',
    process.env.NODE_ENV === 'production' ? '' : path.join(process.cwd(), 'backups'),
  );
  fs.mkdirSync(backupRoot, { recursive: true, mode: 0o700 });

  const backupDir = path.join(backupRoot, `rti-backup-${timestamp()}`);
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });

  const databaseBackup = path.join(backupDir, 'database.sqlite');
  const db = new DatabaseSync(sourceDb);
  db.exec('PRAGMA busy_timeout = 10000;');

  const integrity = db.prepare('PRAGMA integrity_check;').get();
  if (String(integrity?.integrity_check || '').toLowerCase() !== 'ok') {
    db.close();
    throw new Error('Source database integrity_check failed; backup aborted.');
  }

  db.exec(`VACUUM INTO ${sqlString(databaseBackup)};`);
  db.close();
  fs.chmodSync(databaseBackup, 0o600);

  const databaseSha256 = createHash('sha256')
    .update(fs.readFileSync(databaseBackup))
    .digest('hex');

  const includeUploads =
    String(process.env.RTI_BACKUP_INCLUDE_UPLOADS || 'true').toLowerCase() !== 'false';
  const uploadDir = String(process.env.RTI_UPLOAD_DIR || '').trim();
  let uploads = { included: false, sourceConfigured: Boolean(uploadDir) };

  if (includeUploads && uploadDir) {
    const sourceUploads = path.resolve(uploadDir);
    if (fs.existsSync(sourceUploads)) {
      const targetUploads = path.join(backupDir, 'uploads');
      fs.cpSync(sourceUploads, targetUploads, {
        recursive: true,
        force: false,
        errorOnExist: true,
      });
      uploads = { included: true, sourceConfigured: true };
    }
  }

  let appVersion = '';
  try {
    appVersion = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version || '';
  } catch {
    // Backup must not fail only because package metadata is unavailable.
  }

  const manifest = {
    format: 'rti-universal-backup-v1',
    createdAt: new Date().toISOString(),
    appVersion,
    database: {
      file: 'database.sqlite',
      sourceBasename: path.basename(sourceDb),
      integrity: 'ok',
      sha256: databaseSha256,
    },
    uploads,
  };

  fs.writeFileSync(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    { mode: 0o600 },
  );

  const retentionDays = Number(process.env.RTI_BACKUP_RETENTION_DAYS || '14');
  cleanupOldBackups(backupRoot, retentionDays);

  console.log(
    JSON.stringify(
      {
        ok: true,
        backupDir,
        database: databaseBackup,
        uploadsIncluded: uploads.included,
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

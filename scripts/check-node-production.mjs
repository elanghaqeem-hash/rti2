#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) fail(`Missing required environment variable: ${name}`);
  return value;
}

const siteUrl = required('NEXT_PUBLIC_SITE_URL');
const adminUsername = required('ADMIN_USERNAME');
const adminPassword = required('ADMIN_PASSWORD');
const sessionSecret = required('ADMIN_SESSION_SECRET');
const rateLimitSalt = required('RATE_LIMIT_SALT');
const dbPathRaw = required('RTI_DB_PATH');

if (siteUrl) {
  try {
    const url = new URL(siteUrl);
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
      fail('NEXT_PUBLIC_SITE_URL must use HTTPS in production.');
    }
  } catch {
    fail('NEXT_PUBLIC_SITE_URL must be a valid absolute URL.');
  }
}

if (adminUsername.length < 3) warn('ADMIN_USERNAME looks unusually short.');
if (adminPassword.length < 12) fail('ADMIN_PASSWORD must be at least 12 characters.');
if (sessionSecret.length < 32) fail('ADMIN_SESSION_SECRET must be at least 32 characters.');
if (rateLimitSalt.length < 16) fail('RATE_LIMIT_SALT must be at least 16 characters.');

if (dbPathRaw) {
  const dbPath = path.resolve(dbPathRaw);
  if (!path.isAbsolute(dbPathRaw)) {
    fail('RTI_DB_PATH must be an absolute path in production.');
  }

  const publicRoot = path.resolve(process.cwd(), 'public');
  if (dbPath === publicRoot || dbPath.startsWith(publicRoot + path.sep)) {
    fail('RTI_DB_PATH must not be inside public/.');
  }
}

const uploadsEnabled =
  String(process.env.RTI_FILE_UPLOADS_ENABLED || 'false').toLowerCase() === 'true';

if (uploadsEnabled) {
  const uploadDirRaw = required('RTI_UPLOAD_DIR');
  const driver = String(process.env.RTI_STORAGE_DRIVER || 'auto').trim().toLowerCase();

  if (!['auto', 'filesystem'].includes(driver)) {
    fail('Standard Node deployment supports RTI_STORAGE_DRIVER=auto or filesystem.');
  }

  if (uploadDirRaw) {
    if (!path.isAbsolute(uploadDirRaw)) {
      fail('RTI_UPLOAD_DIR must be an absolute path in production.');
    }

    const uploadDir = path.resolve(uploadDirRaw);
    const publicRoot = path.resolve(process.cwd(), 'public');
    if (uploadDir === publicRoot || uploadDir.startsWith(publicRoot + path.sep)) {
      fail('RTI_UPLOAD_DIR must be outside public/.');
    }
  }
}

for (const requiredFile of [
  'Dockerfile',
  '.env.production.example',
  'app/api/health/route.ts',
  'scripts/db-migrate.mjs',
  'scripts/backup.mjs',
  'scripts/restore.mjs',
]) {
  if (!fs.existsSync(path.join(process.cwd(), requiredFile))) {
    fail(`Deployment artifact is missing: ${requiredFile}`);
  }
}

if (!String(process.env.RTI_BACKUP_DIR || '').trim()) {
  warn('RTI_BACKUP_DIR is not configured; automatic pre-migration backup will be skipped.');
}

if (warnings.length) {
  for (const message of warnings) console.warn('PREFLIGHT WARNING:', message);
}

if (failures.length) {
  for (const message of failures) console.error('PREFLIGHT BLOCKED:', message);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      profile: 'node-production',
      database: 'sqlite',
      storage: uploadsEnabled ? 'filesystem' : 'disabled',
      warnings: warnings.length,
    },
    null,
    2,
  ),
);

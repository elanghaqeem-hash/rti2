#!/usr/bin/env node

import process from 'node:process';
import { spawnSync, spawn } from 'node:child_process';

function enabled(value, fallback = true) {
  if (value == null || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

function validateRuntimeEnvironment() {
  const required = [
    'NEXT_PUBLIC_SITE_URL',
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD',
    'ADMIN_SESSION_SECRET',
    'RATE_LIMIT_SALT',
    'RTI_DB_PATH',
  ];

  const missing = required.filter((name) => !String(process.env[name] || '').trim());
  if (missing.length) {
    console.error(
      'RTI startup aborted. Missing required environment variables: ' +
        missing.join(', '),
    );
    process.exit(78);
  }

  if (String(process.env.ADMIN_PASSWORD || '').length < 12) {
    console.error('RTI startup aborted. ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(78);
  }

  if (String(process.env.ADMIN_SESSION_SECRET || '').length < 32) {
    console.error(
      'RTI startup aborted. ADMIN_SESSION_SECRET must be at least 32 characters.',
    );
    process.exit(78);
  }

  if (String(process.env.RATE_LIMIT_SALT || '').length < 16) {
    console.error('RTI startup aborted. RATE_LIMIT_SALT must be at least 16 characters.');
    process.exit(78);
  }

  const uploadsEnabled = enabled(process.env.RTI_FILE_UPLOADS_ENABLED, false);
  if (uploadsEnabled && !String(process.env.RTI_UPLOAD_DIR || '').trim()) {
    console.error(
      'RTI startup aborted. RTI_UPLOAD_DIR is required when file uploads are enabled.',
    );
    process.exit(78);
  }
}

validateRuntimeEnvironment();

if (enabled(process.env.RTI_RUN_MIGRATIONS_ON_START, true)) {
  const migration = spawnSync(process.execPath, ['scripts/db-migrate.mjs', 'up'], {
    env: process.env,
    stdio: 'inherit',
  });

  if (migration.status !== 0) {
    console.error('RTI startup aborted because database migration failed.');
    process.exit(migration.status || 1);
  }

  const verify = spawnSync(process.execPath, ['scripts/db-migrate.mjs', 'verify'], {
    env: process.env,
    stdio: 'inherit',
  });

  if (verify.status !== 0) {
    console.error('RTI startup aborted because database verification failed.');
    process.exit(verify.status || 1);
  }
}

const child = spawn(process.execPath, ['server.js'], {
  env: {
    ...process.env,
    HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
    PORT: process.env.PORT || '3000',
  },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

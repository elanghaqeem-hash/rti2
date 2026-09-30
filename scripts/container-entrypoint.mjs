#!/usr/bin/env node

import process from 'node:process';
import { spawnSync, spawn } from 'node:child_process';

function enabled(value, fallback = true) {
  if (value == null || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

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

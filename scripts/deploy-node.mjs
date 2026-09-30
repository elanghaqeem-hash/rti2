#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync, spawn } from 'node:child_process';

const args = new Set(process.argv.slice(2));

function run(command, commandArgs, options = {}) {
  console.log('\n$ ' + [command, ...commandArgs].join(' '));
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status ?? 'unknown'}): ${command}`);
  }
}

function requireProductionEnvironment() {
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
    throw new Error(`Missing required production variables: ${missing.join(', ')}`);
  }

  if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
    console.warn('NODE_ENV is not "production"; forcing production for the build process.');
    process.env.NODE_ENV = 'production';
  }

  const uploadsEnabled =
    String(process.env.RTI_FILE_UPLOADS_ENABLED || 'false').toLowerCase() === 'true';
  if (uploadsEnabled && !String(process.env.RTI_UPLOAD_DIR || '').trim()) {
    throw new Error('RTI_UPLOAD_DIR is required when RTI_FILE_UPLOADS_ENABLED=true.');
  }

  for (const secret of ['ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET', 'RATE_LIMIT_SALT']) {
    if (String(process.env[secret] || '').length < 16) {
      console.warn(`Warning: ${secret} looks short for production. Use a strong random value.`);
    }
  }
}

function assembleStandalone() {
  const standalone = path.join(process.cwd(), '.next', 'standalone');
  if (!fs.existsSync(path.join(standalone, 'server.js'))) {
    throw new Error('Standalone build not found: .next/standalone/server.js');
  }

  const publicDir = path.join(process.cwd(), 'public');
  const staticDir = path.join(process.cwd(), '.next', 'static');

  if (fs.existsSync(publicDir)) {
    fs.rmSync(path.join(standalone, 'public'), { recursive: true, force: true });
    fs.cpSync(publicDir, path.join(standalone, 'public'), { recursive: true });
  }

  fs.mkdirSync(path.join(standalone, '.next'), { recursive: true });
  if (fs.existsSync(staticDir)) {
    fs.rmSync(path.join(standalone, '.next', 'static'), { recursive: true, force: true });
    fs.cpSync(staticDir, path.join(standalone, '.next', 'static'), { recursive: true });
  }
}

function startStandalone() {
  const cwd = path.join(process.cwd(), '.next', 'standalone');
  const child = spawn(process.execPath, ['server.js'], {
    cwd,
    env: {
      ...process.env,
      HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
      PORT: process.env.PORT || '3000',
    },
    stdio: 'inherit',
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => child.kill(signal));
  }

  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
}

try {
  requireProductionEnvironment();

  if (!args.has('--skip-install')) run('npm', ['ci']);

  const dbPath = path.resolve(String(process.env.RTI_DB_PATH));
  if (
    !args.has('--skip-backup') &&
    fs.existsSync(dbPath) &&
    String(process.env.RTI_BACKUP_DIR || '').trim()
  ) {
    run(process.execPath, ['scripts/backup.mjs']);
  }

  if (!args.has('--skip-migrate')) {
    run(process.execPath, ['scripts/db-migrate.mjs', 'up']);
    run(process.execPath, ['scripts/db-migrate.mjs', 'verify']);
  }

  if (!args.has('--skip-preflight')) {
    run('npm', ['run', 'production:preflight:node']);
  }

  if (!args.has('--skip-build')) {
    run('npm', ['run', 'build:next']);
    assembleStandalone();
  }

  const output = path.join(process.cwd(), '.next', 'standalone');
  console.log(
    '\n' +
      JSON.stringify(
        {
          ok: true,
          runtime: 'node-standalone',
          output,
          start: `cd ${output} && node server.js`,
          health: `http://127.0.0.1:${process.env.PORT || '3000'}/api/health`,
        },
        null,
        2,
      ),
  );

  if (args.has('--start')) startStandalone();
} catch (error) {
  console.error(
    '\n' +
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

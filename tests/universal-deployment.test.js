import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('universal deployment artifacts are present', () => {
  for (const file of [
    'Dockerfile',
    '.dockerignore',
    '.env.production.example',
    'docs/UNIVERSAL_PRODUCTION_DEPLOYMENT.md',
    'app/api/health/route.ts',
    'scripts/db-migrate.mjs',
    'scripts/backup.mjs',
    'scripts/restore.mjs',
    'scripts/deploy-node.mjs',
    'scripts/container-entrypoint.mjs',
    'scripts/check-node-production.mjs',
  ]) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} must exist`);
  }
});

test('deployment scripts pass Node syntax check', () => {
  for (const script of [
    'scripts/db-migrate.mjs',
    'scripts/backup.mjs',
    'scripts/restore.mjs',
    'scripts/deploy-node.mjs',
    'scripts/container-entrypoint.mjs',
    'scripts/check-node-production.mjs',
  ]) {
    const result = spawnSync(process.execPath, ['--check', script], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || `${script} failed syntax check`);
  }
});

test('Node SQLite migration CLI can build and verify a fresh RTI database', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rti-migrate-'));
  const db = path.join(temp, 'rti.sqlite');

  try {
    const up = spawnSync(process.execPath, ['scripts/db-migrate.mjs', 'up', '--db', db], {
      cwd: root,
      env: { ...process.env, NODE_ENV: 'test' },
      encoding: 'utf8',
      timeout: 60000,
    });
    assert.equal(up.status, 0, up.stderr || up.stdout);

    const verify = spawnSync(
      process.execPath,
      ['scripts/db-migrate.mjs', 'verify', '--db', db],
      {
        cwd: root,
        env: { ...process.env, NODE_ENV: 'test' },
        encoding: 'utf8',
        timeout: 60000,
      },
    );
    assert.equal(verify.status, 0, verify.stderr || verify.stdout);

    const result = JSON.parse(
      verify.stdout.slice(verify.stdout.lastIndexOf('{')),
    );
    assert.equal(result.ready, true);
    assert.equal(result.integrity, 'ok');
    assert.equal(result.pending.length, 0);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('Docker profile uses persistent data and health check', () => {
  const dockerfile = read('Dockerfile');
  assert.match(dockerfile, /node:24-bookworm-slim/);
  assert.match(dockerfile, /VOLUME \["\/data"\]/);
  assert.match(dockerfile, /\/api\/health/);
  assert.match(dockerfile, /container-entrypoint\.mjs/);
});

test('storage abstraction keeps Cloudflare and standard Node backends', () => {
  const storage = read('lib/server/object-storage.ts');
  assert.match(storage, /cloudflare-r2/);
  assert.match(storage, /filesystem/);
  assert.match(storage, /RTI_FILES/);
  assert.match(storage, /RTI_UPLOAD_DIR/);
});

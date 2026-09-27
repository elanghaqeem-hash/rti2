import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Security readiness: environment secrets are ignored while .env.example stays tracked', () => {
  const gitignore = read('.gitignore');
  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
});

test('Security readiness: admin and lead-read routes are protected by middleware', () => {
  const middleware = read('middleware.ts');
  assert.match(middleware, /ADMIN_USERNAME/);
  assert.match(middleware, /ADMIN_PASSWORD/);
  assert.match(middleware, /\/admin\/:path\*/);
  assert.match(middleware, /\/api\/leads/);
  assert.match(middleware, /WWW-Authenticate/);
});

test('Security readiness: public compute APIs use rate limiting', () => {
  for (const file of [
    'app/api/chat/route.ts',
    'app/api/assessment/score/route.ts',
    'app/api/tools/headers-check/route.ts',
    'app/api/leads/route.ts',
  ]) {
    const content = read(file);
    assert.match(content, /enforceRateLimit/, `${file} must enforce a rate limit`);
  }
});

test('Security readiness: lead capture uses server-side Turnstile verification', () => {
  const leadApi = read('app/api/leads/route.ts');
  assert.match(leadApi, /verifyTurnstile/);
  assert.match(leadApi, /turnstileToken/);

  const contact = read('app/contact/page.tsx');
  const leadModal = read('components/tools/LeadModal.tsx');
  assert.match(contact, /TurnstileWidget/);
  assert.match(leadModal, /TurnstileWidget/);
});

test('Security readiness: passive scanner never follows redirects automatically', () => {
  const scanner = read('app/api/tools/headers-check/route.ts');
  assert.doesNotMatch(scanner, /redirect:\s*['"]follow['"]/);
  assert.match(scanner, /redirect:\s*['"]manual['"]/);
});

test('Build readiness: production build pins tooling and never bypasses dependency checks with --force', () => {
  const packageJson = JSON.parse(read('package.json'));
  assert.doesNotMatch(packageJson.scripts.build, /--force/);
  assert.match(packageJson.scripts.build, /--no-save/);
  assert.match(packageJson.scripts.build, /--package-lock=false/);
  assert.match(packageJson.scripts.build, /@opennextjs\/cloudflare@1\.20\.6/);
  assert.match(packageJson.scripts.build, /wrangler@4\.141\.0/);
});

test('Dependency hardening: Next nested PostCSS is overridden to a patched line', () => {
  const packageJson = JSON.parse(read('package.json'));
  assert.equal(packageJson.overrides?.next?.postcss, '8.5.28');
});


test('Data readiness: lead persistence uses Cloudflare D1 with prepared statements', () => {
  const repository = read('lib/data/lead-repository.ts');
  const leadApi = read('app/api/leads/route.ts');
  const migration = read('migrations/0001_leads.sql');

  assert.match(repository, /getCloudflareContext/);
  assert.match(repository, /RTI_DB/);
  assert.match(repository, /\.prepare\(/);
  assert.match(repository, /\.bind\(/);
  assert.match(leadApi, /createPersistentLead/);
  assert.match(leadApi, /listPersistentLeads/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS leads/i);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+leads/i);
});

test('Data readiness: D1 migration records consent and lead lifecycle fields', () => {
  const migration = read('migrations/0001_leads.sql');
  for (const column of [
    'created_at',
    'source',
    'email',
    'score',
    'status',
    'consent_at',
    'consent_version',
  ]) {
    assert.match(migration, new RegExp(`\\b${column}\\b`, 'i'));
  }
});

test('Security readiness: lead CSV export neutralizes spreadsheet formulas', () => {
  const adminPage = read('app/admin/leads/page.tsx');
  assert.match(adminPage, /function csvCell/);
  assert.match(adminPage, /\^\[=\+\\-@/);
  assert.match(adminPage, /replace\(\/"\/g/);
});

test('Developer readiness: local dev installs the same pinned OpenNext adapter used by build', () => {
  const packageJson = JSON.parse(read('package.json'));
  assert.match(packageJson.scripts.dev, /@opennextjs\/cloudflare@1\.20\.6/);
  assert.match(packageJson.scripts.dev, /wrangler@4\.141\.0/);
});

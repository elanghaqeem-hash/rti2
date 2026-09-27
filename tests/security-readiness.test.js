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

test('Security readiness: admin pages use signed session authentication', () => {
  const middleware = read('middleware.ts');
  const layout = read('app/admin/layout.tsx');
  const auth = read('lib/admin/auth.ts');

  assert.match(middleware, /rti_admin_session/);
  assert.match(middleware, /\/admin-access/);
  assert.match(layout, /verifyAdminSession/);
  assert.match(auth, /ADMIN_SESSION_SECRET/);
  assert.match(auth, /createHmac/);
  assert.match(auth, /timingSafeEqual/);
});

test('Security readiness: admin APIs require authenticated admin sessions', () => {
  const parameterApi = read('app/api/admin/parameters/route.ts');
  const systemApi = read('app/api/admin/system/setup/route.ts');
  const leadApi = read('app/api/leads/route.ts');

  assert.match(parameterApi, /isAdminRequest/);
  assert.match(systemApi, /isAdminRequest/);
  assert.match(leadApi, /isAdminRequest/);
  assert.doesNotMatch(parameterApi, /x-rti-admin-token/i);
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

test('Build readiness: production build keeps dependency checks and an explicit Next build stage', () => {
  const packageJson = JSON.parse(read('package.json'));
  assert.equal(packageJson.scripts.dev, 'next dev');
  assert.ok(
    packageJson.scripts.build === 'next build' ||
      packageJson.scripts.build === 'npm run build:cloudflare',
  );
  const effectiveBuild =
    packageJson.scripts.build === 'npm run build:cloudflare'
      ? packageJson.scripts['build:cloudflare']
      : packageJson.scripts.build;
  assert.match(effectiveBuild, /next build/);
  assert.doesNotMatch(effectiveBuild, /--force/);
});

test('Dependency hardening: Next nested PostCSS is overridden to a patched line', () => {
  const packageJson = JSON.parse(read('package.json'));
  assert.equal(packageJson.overrides?.next?.postcss, '8.5.28');
});

test('Data readiness: lead persistence uses the server database with prepared statements', () => {
  const repository = read('lib/data/lead-repository.ts');
  const database = read('lib/server/database.ts');
  const leadApi = read('app/api/leads/route.ts');
  const migration = read('migrations/0001_leads.sql');

  assert.match(database, /node:sqlite/);
  assert.match(database, /RTI_DB_PATH/);
  assert.match(repository, /\.prepare\(/);
  assert.match(repository, /\.run\(/);
  assert.match(repository, /\.all\(/);
  assert.match(leadApi, /createPersistentLead/);
  assert.match(leadApi, /listPersistentLeads/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS leads/i);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+leads/i);
});

test('Data readiness: migrations record consent, lead lifecycle and parameter registry fields', () => {
  const leadMigration = read('migrations/0001_leads.sql');
  const parameterMigration = read('migrations/0002_system_parameters.sql');

  for (const column of [
    'created_at',
    'source',
    'email',
    'score',
    'status',
    'consent_at',
    'consent_version',
  ]) {
    assert.match(leadMigration, new RegExp(`\\b${column}\\b`, 'i'));
  }

  assert.match(parameterMigration, /CREATE TABLE IF NOT EXISTS system_parameters/i);
  assert.match(parameterMigration, /group_key/i);
  assert.match(parameterMigration, /is_active/i);
});

test('Admin readiness: database migrations are executable only through protected admin setup API', () => {
  const setupApi = read('app/api/admin/system/setup/route.ts');
  const migrations = read('lib/server/migrations.ts');

  assert.match(setupApi, /isAdminRequest/);
  assert.match(setupApi, /applyPendingMigrations/);
  assert.match(migrations, /0001_leads\.sql/);
  assert.match(migrations, /0002_system_parameters\.sql/);
  assert.match(migrations, /schema_migrations/);
});

test('Security readiness: lead CSV export neutralizes spreadsheet formulas', () => {
  const adminPage = read('app/admin/leads/page.tsx');
  assert.match(adminPage, /function csvCell/);
  assert.match(adminPage, /\^\[=\+\\-@/);
  assert.match(adminPage, /replace\(\/"\/g/);
});

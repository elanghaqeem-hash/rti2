import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('NIST CSF 2.0 migration seeds six functions, 22 categories and a 22+ question quick check without production assessments', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rti-nist-'));
  const databasePath = path.join(directory, 'nist.sqlite');
  const db = new DatabaseSync(databasePath);

  try {
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec(read('migrations/0002_system_parameters.sql'));
    db.exec(read('migrations/0003_nist_cyber_quick_check.sql'));

    const functions = db.prepare('SELECT COUNT(*) AS count FROM nist_functions').get();
    const categories = db.prepare('SELECT COUNT(*) AS count FROM nist_categories').get();
    const questions = db.prepare('SELECT COUNT(*) AS count FROM nist_questions WHERE active = 1').get();
    const assessments = db.prepare('SELECT COUNT(*) AS count FROM nist_assessments').get();

    assert.equal(Number(functions.count), 6);
    assert.equal(Number(categories.count), 22);
    assert.ok(Number(questions.count) >= 22 && Number(questions.count) <= 30);
    assert.equal(Number(assessments.count), 0);

    const categoryCodes = db
      .prepare('SELECT code FROM nist_categories ORDER BY code')
      .all()
      .map((row) => row.code);

    for (const expected of [
      'GV.OC', 'GV.RM', 'GV.RR', 'GV.PO', 'GV.OV', 'GV.SC',
      'ID.AM', 'ID.RA', 'ID.IM',
      'PR.AA', 'PR.AT', 'PR.DS', 'PR.PS', 'PR.IR',
      'DE.CM', 'DE.AE',
      'RS.MA', 'RS.AN', 'RS.CO', 'RS.MI',
      'RC.RP', 'RC.CO',
    ]) {
      assert.ok(categoryCodes.includes(expected), 'Missing category ' + expected);
    }
  } finally {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('NIST answer scale and evidence confidence are database driven', () => {
  const migration = read('migrations/0003_nist_cyber_quick_check.sql');
  for (const label of [
    'Not Implemented',
    'Ad Hoc',
    'Defined',
    'Implemented',
    'Measured & Improved',
    'Not Sure',
    'Evidence Available',
    'Partially Available',
    'No Evidence',
  ]) {
    assert.ok(migration.includes(label), 'Missing configured label: ' + label);
  }

  const page = read('app/tools/cyber-quick-check/page.tsx');
  assert.doesNotMatch(page, /NIST_QUESTIONS/);
  assert.match(page, /\/api\/nist-assessment\/config/);
  assert.match(page, /config\.answerOptions/);
  assert.match(page, /config\.evidenceOptions/);
});

test('NIST assessment data is isolated with an opaque server-side capability and never put into result URLs', () => {
  const migration = read('migrations/0003_nist_cyber_quick_check.sql');
  const access = read('lib/nist/access.ts');
  const repository = read('lib/nist/repository.ts');
  const page = read('app/tools/cyber-quick-check/page.tsx');

  assert.match(migration, /access_token_hash TEXT NOT NULL/);
  assert.match(repository, /randomBytes\(32\)/);
  assert.match(repository, /createHash\('sha256'\)/);
  assert.match(repository, /timingSafeEqual/);
  assert.match(access, /HttpOnly/);
  assert.match(access, /SameSite=Lax/);
  assert.doesNotMatch(page, /missingMFA|noSOC/);
});

test('NIST public APIs use rate limiting and sensitive resource APIs enforce assessment access', () => {
  for (const file of [
    'app/api/nist-assessment/config/route.ts',
    'app/api/nist-assessment/start/route.ts',
    'app/api/nist-assessment/[id]/answer/route.ts',
    'app/api/nist-assessment/[id]/complete/route.ts',
    'app/api/nist-assessment/[id]/advisor/route.ts',
    'app/api/nist-assessment/[id]/report/route.ts',
  ]) {
    assert.match(read(file), /enforceRateLimit/, file + ' must enforce rate limiting');
  }

  for (const file of [
    'app/api/nist-assessment/[id]/answer/route.ts',
    'app/api/nist-assessment/[id]/complete/route.ts',
    'app/api/nist-assessment/[id]/results/route.ts',
    'app/api/nist-assessment/[id]/advisor/route.ts',
    'app/api/nist-assessment/[id]/report/route.ts',
  ]) {
    assert.match(read(file), /hasNistAssessmentAccess/, file + ' must enforce assessment access');
  }

  assert.match(read('app/api/nist-assessment/start/route.ts'), /verifyTurnstile/);
  assert.match(read('app/api/admin/nist/route.ts'), /isAdminRequest/);
});

test('NIST scoring is deterministic and AI is advisory only', () => {
  const engine = read('lib/nist/engine.ts');
  const advisor = read('app/api/nist-assessment/[id]/advisor/route.ts');

  assert.match(engine, /weightedAverage/);
  assert.match(engine, /indicativeTier/);
  assert.match(engine, /confidenceScore/);
  assert.match(engine, /riskCoordinates/);
  assert.doesNotMatch(engine, /generateAiWithFailover/);

  assert.match(advisor, /generateAiWithFailover/);
  assert.match(advisor, /Never modify, reinterpret, or invent raw scores/);
  assert.match(advisor, /Insufficient information for a definitive conclusion/);
});

test('NIST report, versioning, service mapping and admin CMS are wired to persistent data', () => {
  const migration = read('migrations/0003_nist_cyber_quick_check.sql');
  const report = read('app/api/nist-assessment/[id]/report/route.ts');
  const admin = read('app/api/admin/nist/route.ts');
  const adminPage = read('app/admin/nist/page.tsx');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS nist_generated_reports/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS nist_service_mappings/);
  assert.match(report, /recordNistGeneratedReport/);
  assert.match(report, /application\/pdf/);
  assert.match(admin, /getNistAssessmentConfig/);
  assert.match(adminPage, /Question Bank/);
  assert.match(adminPage, /RTI Service Mapping/);
  assert.match(adminPage, /Audit Logs/);
});

test('NIST multi-provider architecture includes DeepSeek and admin-managed provider priority', () => {
  const router = read('lib/ai/provider-router.ts');
  const parameters = read('lib/parameters/catalog.ts');
  const env = read('.env.example');

  assert.match(router, /deepseek/);
  assert.match(router, /ai\.provider_order/);
  assert.match(parameters, /key: 'ai\.provider_order'/);
  assert.match(env, /DEEPSEEK_API_KEY=/);
  assert.match(env, /DEEPSEEK_MODEL=deepseek-chat/);
});

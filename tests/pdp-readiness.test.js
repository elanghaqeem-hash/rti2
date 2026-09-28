import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const root = process.cwd();
const migrations = [
  '0001_leads.sql',
  '0002_system_parameters.sql',
  '0003_enterprise_solution_finder.sql',
  '0004_nist_cyber_quick_check.sql',
  '0005_project_estimator_rfq.sql',
  '0006_project_estimator_ai_scoping.sql',
  '0007_project_estimator_copilot.sql',
  '0008_pdp_readiness.sql',
];

function createMigratedDb() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rti-pdp-'));
  const db = new DatabaseSync(path.join(directory, 'pdp.sqlite'));
  db.exec('PRAGMA foreign_keys = ON;');
  for (const name of migrations) {
    db.exec(fs.readFileSync(path.join(root, 'migrations', name), 'utf8'));
  }
  return { db, directory };
}

test('UU PDP migration creates complete 7-domain diagnostic framework', () => {
  const { db, directory } = createMigratedDb();
  try {
    const framework = db
      .prepare("SELECT code,status FROM pdp_framework_versions WHERE code='UU-PDP-27-2022-RTI-1.0'")
      .get();

    assert.equal(framework.code, 'UU-PDP-27-2022-RTI-1.0');
    assert.equal(framework.status, 'active');

    assert.equal(
      db.prepare("SELECT COUNT(*) AS count FROM pdp_domains WHERE framework_version=? AND is_active=1")
        .get(framework.code).count,
      7,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS count FROM pdp_questions WHERE framework_version=? AND active=1")
        .get(framework.code).count,
      42,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS count FROM pdp_questions WHERE framework_version=? AND active=1 AND is_core=1")
        .get(framework.code).count,
      14,
    );

    const perDomain = db.prepare(
      "SELECT domain_code,COUNT(*) AS count FROM pdp_questions WHERE framework_version=? AND active=1 GROUP BY domain_code ORDER BY domain_code",
    ).all(framework.code);
    assert.deepEqual(
      Object.fromEntries(perDomain.map((row) => [row.domain_code, row.count])),
      { GOV: 6, INV: 6, LGL: 6, RGT: 6, RSK: 6, SEC: 6, TPR: 6 },
    );

    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM pdp_readiness_gates WHERE active=1").get().count, 7);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM pdp_answer_options WHERE active=1").get().count, 7);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM pdp_evidence_options WHERE active=1").get().count, 6);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM pdp_service_mappings WHERE active=1").get().count, 7);
  } finally {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('UU PDP diagnostic questions carry traceable evidence, risk, recommendation and legal metadata', () => {
  const { db, directory } = createMigratedDb();
  try {
    const rows = db.prepare(
      "SELECT question_code,legal_reference,expected_evidence,risk_if_missing,recommendation FROM pdp_questions WHERE active=1",
    ).all();

    assert.equal(rows.length, 42);
    for (const row of rows) {
      assert.ok(String(row.legal_reference || '').includes('UU 27/2022'), row.question_code + ' missing legal reference');
      assert.ok(String(row.expected_evidence || '').length > 8, row.question_code + ' missing evidence guidance');
      assert.ok(String(row.risk_if_missing || '').length > 8, row.question_code + ' missing risk');
      assert.ok(String(row.recommendation || '').length > 8, row.question_code + ' missing recommendation');
    }
  } finally {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('UU PDP schema separates assessment, evidence, gaps, roadmap and audit history', () => {
  const { db, directory } = createMigratedDb();
  try {
    const existing = new Set(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name),
    );
    for (const table of [
      'pdp_assessments',
      'pdp_answers',
      'pdp_domain_scores',
      'pdp_gap_findings',
      'pdp_roadmap_items',
      'pdp_evidence_files',
      'pdp_generated_reports',
      'pdp_audit_logs',
    ]) {
      assert.ok(existing.has(table), 'missing table: ' + table);
    }

    const assessmentColumns = new Set(
      db.prepare("PRAGMA table_info('pdp_assessments')").all().map((row) => row.name),
    );
    for (const column of [
      'access_token_hash',
      'implementation_score',
      'evidence_score',
      'overall_score',
      'readiness_level',
      'gates_completed',
      'evidence_processing_consent',
    ]) {
      assert.ok(assessmentColumns.has(column), 'missing assessment column: ' + column);
    }
  } finally {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('Cloudflare runtime migration registry contains PDP migration and health checks', () => {
  const registry = fs.readFileSync(path.join(root, 'lib/server/runtime-migration-registry.ts'), 'utf8');
  const runtimeMigrations = fs.readFileSync(path.join(root, 'lib/server/runtime-migrations.ts'), 'utf8');

  assert.match(registry, /0008_pdp_readiness\.sql/);
  assert.match(runtimeMigrations, /pdpAssessments/);
  assert.match(runtimeMigrations, /pdp_questions/);
  assert.match(runtimeMigrations, /pdp_evidence_files/);
});

test('UU PDP public routes use cookie authorization, rate limits and Turnstile', () => {
  const start = fs.readFileSync(path.join(root, 'app/api/pdp-assessment/start/route.ts'), 'utf8');
  const access = fs.readFileSync(path.join(root, 'lib/pdp/access.ts'), 'utf8');
  const answer = fs.readFileSync(path.join(root, 'app/api/pdp-assessment/[id]/answer/route.ts'), 'utf8');
  const report = fs.readFileSync(path.join(root, 'app/api/pdp-assessment/[id]/report/route.ts'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'app/api/admin/pdp/route.ts'), 'utf8');

  assert.match(start, /verifyTurnstile/);
  assert.match(start, /enforceRateLimit/);
  assert.match(access, /HttpOnly/);
  assert.match(access, /SameSite=Lax/);
  assert.match(answer, /hasPdpAssessmentAccess/);
  assert.match(report, /hasPdpAssessmentAccess/);
  assert.doesNotMatch(report, /searchParams\.get\(['"]token['"]\)/);
  assert.match(admin, /isAdminRequest/);
});

test('UU PDP evidence uses private object storage and production upload gate', () => {
  const route = fs.readFileSync(path.join(root, 'app/api/pdp-assessment/[id]/evidence/route.ts'), 'utf8');
  const storage = fs.readFileSync(path.join(root, 'lib/server/object-storage.ts'), 'utf8');

  assert.match(route, /putPrivateObject/);
  assert.match(route, /RTI_FILE_UPLOADS_ENABLED/);
  assert.match(route, /RTI_FILE_UPLOAD_MAX_BYTES/);
  assert.match(route, /enforceRateLimit/);
  assert.match(storage, /RTI_FILES/);
  assert.doesNotMatch(route, /public\//);
});

test('UU PDP runtime repository targets the D1-or-SQLite adapter rather than direct Node SQLite', () => {
  const repository = fs.readFileSync(path.join(root, 'lib/pdp/runtime-repository.ts'), 'utf8');
  assert.match(repository, /getRuntimeDatabase/);
  assert.doesNotMatch(repository, /getDatabase\(/);
  assert.doesNotMatch(repository, /node:fs/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const root = process.cwd();
const migrationNames = [
  '0001_leads.sql',
  '0002_system_parameters.sql',
  '0003_iso27001_readiness.sql',
  '0004_iso27001_rules.sql',
  '0005_iso27001_evidence_rules.sql',
  '0006_iso27001_adaptive_questions.sql',
  '0007_iso27001_stage_indicators.sql',
  '0008_iso27001_persisted_dimensions.sql',
  '0009_iso27001_applicability_parameters.sql',
];

function migratedDb() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rti-iso27001-'));
  const dbPath = path.join(directory, 'test.sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  for (const name of migrationNames) {
    db.exec(fs.readFileSync(path.join(root, 'migrations', name), 'utf8'));
  }
  return { db, directory };
}

test('ISO 27001 migrations create a coherent published framework', () => {
  const { db, directory } = migratedDb();
  try {
    const version = db.prepare(
      "SELECT id, version, status FROM assessment_versions WHERE template_id = 'TPL-ISO27001'",
    ).get();
    assert.equal(version.version, 'ISO27001-2022-RTI-v1.0');
    assert.equal(version.status, 'Published');

    const activeControls = db.prepare(
      "SELECT COUNT(*) AS count FROM annex_controls WHERE version_id = ? AND status = 'active'",
    ).get(version.id);
    assert.equal(activeControls.count, 93);

    const byDomain = db.prepare(
      "SELECT domain, COUNT(*) AS count FROM annex_controls WHERE version_id = ? GROUP BY domain ORDER BY domain",
    ).all(version.id);
    assert.deepEqual(
      Object.fromEntries(byDomain.map((row) => [row.domain, row.count])),
      {
        Organizational: 37,
        People: 8,
        Physical: 14,
        Technological: 34,
      },
    );

    const quick = db.prepare(
      "SELECT COUNT(*) AS count FROM assessment_questions WHERE version_id = ? AND status = 'active' AND is_quick = 1",
    ).get(version.id);
    assert.equal(quick.count, 39);

    const adaptive = db.prepare(
      "SELECT COUNT(*) AS count FROM assessment_questions WHERE version_id = ? AND status = 'active' AND is_quick = 0",
    ).get(version.id);
    assert.equal(adaptive.count, 15);

    const gates = db.prepare(
      'SELECT COUNT(*) AS count FROM readiness_gates WHERE version_id = ? AND is_active = 1',
    ).get(version.id);
    assert.equal(gates.count, 10);

    const responseOptions = db.prepare(
      "SELECT COUNT(*) AS count FROM response_options WHERE version_id = ? AND status = 'active'",
    ).get(version.id);
    assert.equal(responseOptions.count, 7);

    const coreScoring = db.prepare(
      "SELECT COUNT(*) AS count FROM scoring_rules WHERE version_id = ? AND is_active = 1 AND rule_key IN ('requirement_readiness','control_readiness','evidence_readiness','governance_readiness','audit_readiness')",
    ).get(version.id);
    assert.equal(coreScoring.count, 5);

    const stageScoring = db.prepare(
      "SELECT COUNT(*) AS count FROM scoring_rules WHERE version_id = ? AND is_active = 1 AND (rule_key LIKE 'stage1_%' OR rule_key LIKE 'stage2_%')",
    ).get(version.id);
    assert.equal(stageScoring.count, 6);
  } finally {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('ISO Annex A seed content uses control references and RTI diagnostic paraphrases', () => {
  const { db, directory } = migratedDb();
  try {
    const controls = db.prepare(
      "SELECT control_ref, title, question_text FROM annex_controls ORDER BY sort_order",
    ).all();

    assert.equal(controls.length, 93);
    assert.equal(controls[0].control_ref, 'A.5.1');
    assert.equal(controls.at(-1).control_ref, 'A.8.34');
    assert.ok(
      controls.every((control) =>
        String(control.question_text).includes('Has the organization defined'),
      ),
    );
  } finally {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('ISO readiness schema supports tenant-scoped assessment evidence and audit records', () => {
  const { db, directory } = migratedDb();
  try {
    const requiredTables = [
      'organizations',
      'assessments',
      'assessment_responses',
      'evidence_files',
      'control_applicability',
      'risks',
      'gap_register',
      'roadmap_items',
      'audit_logs',
    ];

    const existing = new Set(
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name),
    );

    for (const table of requiredTables) assert.ok(existing.has(table), 'missing table: ' + table);

    const columns = new Set(
      db.prepare("PRAGMA table_info('assessments')").all().map((row) => row.name),
    );
    for (const column of ['organization_id','access_token_hash','requirement_score','control_score','stage1_score','stage2_score']) {
      assert.ok(columns.has(column), 'missing assessments column: ' + column);
    }
  } finally {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('public ISO routes require assessment token and admin routes use admin authorization', () => {
  const assessmentRoute = fs.readFileSync(path.join(root, 'app/api/assessments/[id]/route.ts'), 'utf8');
  const responseRoute = fs.readFileSync(path.join(root, 'app/api/assessments/[id]/responses/route.ts'), 'utf8');
  const adminRoute = fs.readFileSync(path.join(root, 'app/api/admin/iso27001/route.ts'), 'utf8');
  const reportRoute = fs.readFileSync(path.join(root, 'app/api/assessments/[id]/report/route.ts'), 'utf8');

  assert.match(assessmentRoute, /x-assessment-token/);
  assert.match(responseRoute, /x-assessment-token/);
  assert.match(adminRoute, /isAdminRequest/);
  assert.doesNotMatch(reportRoute, /searchParams\.get\(['"]token['"]\)/);
});

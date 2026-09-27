import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('PDP database migration executes cleanly in SQLite and creates required schema', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    for (const migration of [
      'migrations/0001_leads.sql',
      'migrations/0002_system_parameters.sql',
      'migrations/0003_pdp_readiness.sql',
    ]) {
      db.exec(read(migration));
    }

    const tables = new Set(
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((row) => String(row.name)),
    );

    for (const table of [
      'organizations',
      'pdp_regulations',
      'pdp_regulation_articles',
      'pdp_domains',
      'pdp_question_sets',
      'pdp_questions',
      'pdp_answer_options',
      'pdp_industry_packs',
      'pdp_assessments',
      'pdp_responses',
      'pdp_evidences',
      'pdp_risk_findings',
      'pdp_recommendations',
      'pdp_roadmap_items',
      'pdp_service_mappings',
      'pdp_scoring_parameters',
      'pdp_maturity_levels',
      'pdp_evidence_types',
      'pdp_ai_prompts',
      'pdp_report_templates',
      'pdp_report_versions',
      'pdp_audit_logs',
    ]) {
      assert.ok(tables.has(table), 'missing PDP table: ' + table);
    }

    const questionColumns = db
      .prepare("PRAGMA table_info('pdp_questions')")
      .all()
      .map((row) => String(row.name));
    for (const column of [
      'question_text',
      'regulation_reference',
      'article_reference',
      'control_objective',
      'risk_statement',
      'recommended_evidence',
      'weight',
      'criticality',
      'answer_type',
      'answer_options_json',
      'branching_rule_json',
      'industry_applicability_json',
      'organization_size_json',
      'risk_trigger_json',
      'dpo_trigger_json',
      'dpia_trigger_json',
      'cross_border_trigger_json',
      'effective_date',
      'version',
      'status',
    ]) {
      assert.ok(questionColumns.includes(column), 'missing PDP question column: ' + column);
    }
  } finally {
    db.close();
  }
});

test('PDP schema enforces assessment mode and risk matrix ranges', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(read('migrations/0003_pdp_readiness.sql'));

    assert.throws(() => {
      db.prepare(
        `INSERT INTO pdp_assessments (
          id, resume_token_hash, mode, status, profile_json,
          question_set_version, regulation_version, scoring_model_version,
          assessment_date, created_at, updated_at
        ) VALUES ('a', 'h', 'invalid', 'in_progress', '{}', '1', '1', '1', 'x', 'x', 'x')`,
      ).run();
    });

    assert.throws(() => {
      db.exec(`
        INSERT INTO pdp_assessments (
          id, resume_token_hash, mode, status, profile_json,
          question_set_version, regulation_version, scoring_model_version,
          assessment_date, created_at, updated_at
        ) VALUES ('a', 'h', 'quick', 'in_progress', '{}', '1', '1', '1', 'x', 'x', 'x');
        INSERT INTO pdp_risk_findings (
          id, assessment_id, risk_event, impact, likelihood, inherent_risk, created_at
        ) VALUES ('r', 'a', 'risk', 6, 5, 30, 'x');
      `);
    });
  } finally {
    db.close();
  }
});

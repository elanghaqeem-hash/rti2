import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Enterprise Solution Finder: production data model and configuration are migration-backed', () => {
  const migration = read('migrations/0003_enterprise_solution_finder.sql');
  const migrations = read('lib/server/runtime-migrations.ts');
  const registry = read('lib/server/runtime-migration-registry.ts');

  for (const table of [
    'enterprise_finder_questions',
    'enterprise_finder_question_options',
    'enterprise_finder_services',
    'enterprise_finder_service_mappings',
    'enterprise_finder_scoring_weights',
    'enterprise_finder_ai_prompts',
    'enterprise_finder_assessments',
    'enterprise_finder_answers',
    'enterprise_finder_recommendations',
    'enterprise_finder_events',
    'audit_logs',
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i'));
  }

  assert.match(registry, /0003_enterprise_solution_finder\.sql/);
  assert.match(migrations, /RUNTIME_MIGRATION_NAMES/);
  assert.doesNotMatch(
    migration,
    /INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+enterprise_finder_(?:assessments|answers|recommendations|events)/i,
    'Migration must not seed operational assessment data.',
  );
  assert.doesNotMatch(
    migration,
    /INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+leads/i,
    'Migration must not seed lead records.',
  );
});

test('Enterprise Solution Finder: save-and-continue uses a hashed token and never puts the token in the URL', () => {
  const repository = read('lib/enterprise-finder/runtime-repository.ts');
  const sessionApi = read('app/api/enterprise-finder/session/route.ts');
  const resultApi = read('app/api/enterprise-finder/result/[id]/route.ts');
  const page = read('app/tools/solution-finder/page.tsx');

  assert.match(repository, /createHash\('sha256'\)/);
  assert.match(repository, /resume_token_hash/);
  assert.match(sessionApi, /x-assessment-token/i);
  assert.match(resultApi, /x-assessment-token/i);
  assert.doesNotMatch(page, /resumeToken=.*URLSearchParams/i);
  assert.match(page, /localStorage/);
});

test('Enterprise Solution Finder: public diagnostic APIs are rate limited and database-backed', () => {
  for (const file of [
    'app/api/enterprise-finder/session/route.ts',
    'app/api/enterprise-finder/diagnose/route.ts',
    'app/api/enterprise-finder/event/route.ts',
  ]) {
    const source = read(file);
    assert.match(source, /enforceRateLimit/);
  }

  const configApi = read('app/api/enterprise-finder/config/route.ts');
  const diagnoseApi = read('app/api/enterprise-finder/diagnose/route.ts');
  assert.match(configApi, /getFinderConfig/);
  assert.match(diagnoseApi, /getFinderEngineData/);
  assert.match(diagnoseApi, /completeFinderAssessment/);
});

test('Enterprise Solution Finder: deterministic engine is explainable and cross-domain', () => {
  const engine = read('lib/enterprise-finder/engine.ts');

  assert.match(engine, /pressure\.severity/);
  assert.match(engine, /pressure\.regulatory/);
  assert.match(engine, /capabilityGap/);
  assert.match(engine, /serviceMappingVersion/);
  assert.match(engine, /primarySolutions/);
  assert.match(engine, /supportingSolutions/);
  assert.match(engine, /quickWins/);
  assert.match(engine, /strategicInitiatives/);
  assert.match(engine, /recommendedTools/);
  assert.match(engine, /preliminary diagnostic/i);
});

test('Enterprise Solution Finder: customer experience is adaptive, progressive and conversion-ready', () => {
  const page = read('app/tools/solution-finder/page.tsx');

  assert.match(page, /STEP|LANGKAH/);
  assert.match(page, /data_breach_trigger/);
  assert.match(page, /iso27001_trigger/);
  assert.match(page, /soc_trigger/);
  assert.match(page, /Enterprise Pressure Score/);
  assert.match(page, /LeadModal/);
  assert.match(page, /build_rfq/);
  assert.match(page, /window\.print\(\)/);
  assert.match(page, /request_consultation/);
  assert.match(page, /request_proposal/);
});

test('Enterprise Solution Finder: admin configuration and analytics require authenticated admin sessions', () => {
  const configApi = read('app/api/admin/enterprise-finder/config/route.ts');
  const analyticsApi = read('app/api/admin/enterprise-finder/analytics/route.ts');
  const adminRepository = read('lib/enterprise-finder/runtime-admin-repository.ts');

  assert.match(configApi, /isAdminRequest|adminSessionFromRequest/);
  assert.match(analyticsApi, /isAdminRequest/);
  assert.match(adminRepository, /audit_logs/);
  assert.match(adminRepository, /old_value_json/);
  assert.match(adminRepository, /new_value_json/);
});

test('Enterprise Solution Finder: optional AI advisory is guarded and never replaces deterministic diagnosis', () => {
  const diagnoseApi = read('app/api/enterprise-finder/diagnose/route.ts');
  const migration = read('migrations/0003_enterprise_solution_finder.sql');

  assert.match(diagnoseApi, /AI_ENTERPRISE_FINDER_ENABLED/);
  assert.match(diagnoseApi, /generateAiWithFailover/);
  assert.match(diagnoseApi, /Deterministic diagnosis remains authoritative/);
  assert.match(migration, /Jangan mengarang kondisi customer/i);
  assert.match(migration, /preliminary diagnostic/i);
});

test('Enterprise Solution Finder: RFQ handoff carries assessment context instead of asking from zero', () => {
  const finder = read('app/tools/solution-finder/page.tsx');
  const estimator = read('app/tools/project-estimator/page.tsx');

  assert.match(finder, /rti\.enterprise-solution-finder\.rfq-handoff\.v1/);
  assert.match(estimator, /rti\.enterprise-solution-finder\.rfq-handoff\.v1/);
  assert.match(estimator, /Imported from Enterprise Solution Finder/);
});

test('Enterprise Solution Finder: lead qualification supports Hot, Warm and Nurture without customer exposure', () => {
  const scoring = read('lib/scoring/leads.ts');
  const publicFinder = read('app/tools/solution-finder/page.tsx');
  const adminLeads = read('app/admin/leads/page.tsx');

  assert.match(scoring, /'Hot' \| 'Warm' \| 'Nurture'/);
  assert.match(scoring, /identifiedGaps/);
  assert.match(scoring, /requestProposal/);
  assert.doesNotMatch(publicFinder, /leadQualificationLabel/);
  assert.match(adminLeads, /leadQualificationLabel/);
});


test('Enterprise Solution Finder: Cloudflare runtime uses RTI_DB D1 and public UI hides internal setup details', () => {
  const runtimeDatabase = read('lib/server/runtime-database.ts');
  const configApi = read('app/api/enterprise-finder/config/route.ts');
  const page = read('app/tools/solution-finder/page.tsx');
  const setupApi = read('app/api/admin/system/setup/route.ts');

  assert.match(runtimeDatabase, /RTI_DB/);
  assert.match(runtimeDatabase, /cloudflare-d1/);
  assert.match(configApi, /getFinderConfigRuntime/);
  assert.match(setupApi, /applyRuntimePendingMigrations/);
  assert.doesNotMatch(page, /Admin RTI perlu memastikan migration/i);
  assert.doesNotMatch(page, /pending migrations/i);
  assert.match(page, /sedang dalam proses aktivasi/i);
});

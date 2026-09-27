import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Project Estimator: production schema is database-driven and has no transactional seed data', () => {
  const migration = read('migrations/0003_project_estimator_rfq.sql');
  for (const table of [
    'service_categories',
    'services',
    'estimator_questions',
    'estimator_question_options',
    'estimator_rules',
    'estimator_sessions',
    'estimator_answers',
    'project_estimates',
    'rfqs',
    'rfq_versions',
    'opportunities',
    'estimator_audit_logs',
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i'));
  }
  assert.doesNotMatch(migration, /INSERT\s+OR\s+IGNORE\s+INTO\s+(organizations|contacts|estimator_sessions|project_estimates|rfqs|opportunities)/i);
});

test('Project Estimator: migration is registered in protected system setup', () => {
  const migrations = read('lib/server/migrations.ts');
  const setup = read('app/api/admin/system/setup/route.ts');
  assert.match(migrations, /0003_project_estimator_rfq\.sql/);
  assert.match(setup, /isAdminRequest/);
});

test('Project Estimator: public estimate never returns internal calculation trace', () => {
  const route = read('app/api/v1/project-estimator/calculate/route.ts');
  assert.match(route, /verifyEstimatorSessionAccess/);
  assert.match(route, /trace:\s*_internalTrace/);
  assert.match(route, /publicEstimate/);
});

test('Project Estimator: capability tokens are hashed and enforced for draft and RFQ access', () => {
  const repository = read('lib/project-estimator/repository.ts');
  const sessionRoute = read('app/api/v1/project-estimator/session/route.ts');
  const rfqRoute = read('app/api/v1/project-estimator/rfq/[id]/route.ts');
  assert.match(repository, /createHash\('sha256'\)/);
  assert.match(repository, /randomBytes\(32\)/);
  assert.match(repository, /timingSafeEqual/);
  assert.match(sessionRoute, /x-rti-resume-token/i);
  assert.match(rfqRoute, /verifyRfqAccess/);
});

test('Project Estimator: public mutation routes are rate limited and final submission uses Turnstile', () => {
  for (const file of [
    'app/api/v1/project-estimator/session/route.ts',
    'app/api/v1/project-estimator/calculate/route.ts',
    'app/api/v1/project-estimator/rfq/route.ts',
    'app/api/v1/project-estimator/rfq/[id]/submit/route.ts',
  ]) {
    assert.match(read(file), /enforceRateLimit/, `${file} must enforce rate limiting`);
  }
  const submit = read('app/api/v1/project-estimator/rfq/[id]/submit/route.ts');
  const page = read('app/tools/project-estimator/page.tsx');
  assert.match(submit, /verifyTurnstile/);
  assert.match(page, /TurnstileWidget/);
});

test('Project Estimator: core calculation stays deterministic and AI is optional failover only', () => {
  const repository = read('lib/project-estimator/repository.ts');
  assert.match(repository, /evaluateRules/);
  assert.match(repository, /pricing_parameters/);
  assert.match(repository, /generateAiWithFailover/);
  assert.match(repository, /if \(params\.useAi\)/);
});

test('Project Estimator: admin configuration is protected and supports configurable business masters', () => {
  const api = read('app/api/v1/admin/project-estimator/route.ts');
  const admin = read('lib/project-estimator/admin.ts');
  assert.match(api, /adminSessionFromRequest/);
  for (const capability of [
    'upsertServiceCategory',
    'createEstimatorService',
    'createEstimatorQuestion',
    'upsertQuestionOption',
    'upsertEstimatorRule',
    'upsertResourceRole',
    'updateEstimatorSetting',
  ]) {
    assert.match(admin, new RegExp(capability));
  }
});

test('Project Estimator: RFQs and estimates are versioned and auditable', () => {
  const migration = read('migrations/0003_project_estimator_rfq.sql');
  const repository = read('lib/project-estimator/repository.ts');
  assert.match(migration, /UNIQUE\(session_id, version\)/);
  assert.match(migration, /UNIQUE\(rfq_id, version\)/);
  assert.match(repository, /saveRfqVersion/);
  assert.match(repository, /estimator_audit_logs/);
});

test('Project Estimator: internal resource rates are not exposed by public bootstrap', () => {
  const repository = read('lib/project-estimator/repository.ts');
  const bootstrapSegment = repository.slice(repository.indexOf('export function getEstimatorBootstrap'), repository.indexOf('export function upsertEstimatorSession'));
  assert.doesNotMatch(bootstrapSegment, /internal_day_rate/);
  assert.doesNotMatch(bootstrapSegment, /trace_json/);
});


test('Project Estimator: conditional questions are enforced on client and server', () => {
  const page = read('app/tools/project-estimator/page.tsx');
  const repository = read('lib/project-estimator/repository.ts');
  const migration = read('migrations/0003_project_estimator_rfq.sql');
  assert.match(page, /conditionalMatch/);
  assert.match(repository, /questionConditionsMatch/);
  assert.match(repository, /visibleQuestions/);
  assert.match(migration, /estimator_question_conditions/);
  assert.match(migration, /cond-dev-cloud-provider/);
});

test('Project Estimator: production pricing seed does not fabricate commercial values', () => {
  const migration = read('migrations/0003_project_estimator_rfq.sql');
  const repository = read('lib/project-estimator/repository.ts');
  const page = read('app/tools/project-estimator/page.tsx');
  assert.match(migration, /Commercial values are intentionally not seeded/);
  assert.match(repository, /priceConfigured/);
  assert.match(page, /Commercial Review Required/);
  assert.doesNotMatch(migration, /35000000|90000000|150000000|500000000/);
});

test('Project Estimator: RFQ attachment handling is private, validated and fail-closed in production', () => {
  const attachments = read('lib/project-estimator/attachments.ts');
  const route = read('app/api/v1/project-estimator/rfq/[id]/attachments/route.ts');
  assert.match(attachments, /RTI_UPLOAD_DIR/);
  assert.match(attachments, /outside the public web root/);
  assert.match(attachments, /fileMagicMatches/);
  assert.match(attachments, /createHash\('sha256'\)/);
  assert.match(attachments, /RTI_MALWARE_SCAN_URL/);
  assert.match(attachments, /NODE_ENV === 'production'/);
  assert.match(attachments, /RTI_FILE_UPLOADS_ENABLED/);
  assert.match(route, /verifyRfqAccess/);
  assert.match(route, /enforceRateLimit/);
});

test('Project Estimator: save and continue restores latest RFQ without localStorage', () => {
  const page = read('app/tools/project-estimator/page.tsx');
  const repository = read('lib/project-estimator/repository.ts');
  assert.match(page, /#resume=/);
  assert.match(page, /history\.replaceState/);
  assert.doesNotMatch(page, /localStorage/);
  assert.match(repository, /latestRfq/);
  assert.match(repository, /secure_token_hash/);
});

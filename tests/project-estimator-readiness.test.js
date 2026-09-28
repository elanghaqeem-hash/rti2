import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Project Estimator: production schema is database-driven and has no transactional seed data', () => {
  const migration = read('migrations/0005_project_estimator_rfq.sql');
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
  assert.match(migrations, /0005_project_estimator_rfq\.sql/);
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
  const migration = read('migrations/0005_project_estimator_rfq.sql');
  const repository = read('lib/project-estimator/repository.ts');
  assert.match(migration, /UNIQUE\(session_id, version\)/);
  assert.match(migration, /UNIQUE\(rfq_id, version\)/);
  assert.match(repository, /saveRfqVersion/);
  assert.match(repository, /estimator_audit_logs/);
});

test('Project Estimator: internal resource rates are not exposed by public bootstrap', () => {
  const repository = read('lib/project-estimator/repository.ts');
  const bootstrapSegment = repository.slice(repository.indexOf('export async function getEstimatorBootstrap'), repository.indexOf('export async function upsertEstimatorSession'));
  assert.doesNotMatch(bootstrapSegment, /internal_day_rate/);
  assert.doesNotMatch(bootstrapSegment, /trace_json/);
});


test('Project Estimator: conditional questions are enforced on client and server', () => {
  const page = read('app/tools/project-estimator/page.tsx');
  const repository = read('lib/project-estimator/repository.ts');
  const migration = read('migrations/0005_project_estimator_rfq.sql');
  assert.match(page, /conditionalMatch/);
  assert.match(repository, /questionConditionsMatch/);
  assert.match(repository, /visibleQuestions/);
  assert.match(migration, /estimator_question_conditions/);
  assert.match(migration, /cond-dev-cloud-provider/);
});

test('Project Estimator: production pricing seed does not fabricate commercial values', () => {
  const migration = read('migrations/0005_project_estimator_rfq.sql');
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

test('Project Estimator: estimate persistence includes versioned recommendations without persisting public pricing flags', () => {
  const repository = read('lib/project-estimator/repository.ts');
  const migration = read('migrations/0005_project_estimator_rfq.sql');
  assert.match(migration, /recommendations_json TEXT NOT NULL DEFAULT '\[\]'/);
  assert.match(repository, /loadServiceRecommendations/);
  assert.match(repository, /JSON\.stringify\(recommendations\)/);
  assert.match(repository, /recommendations: safeJson\(estimateRow\.recommendations_json/);
  assert.doesNotMatch(
    repository,
    /priceMax,\s*priceConfigured,\s*readinessScore,\s*JSON\.stringify\(team\)/s,
  );
});

test('Project Estimator: complexity size and readiness thresholds are database settings', () => {
  const repository = read('lib/project-estimator/repository.ts');
  for (const key of [
    'complexity_threshold_very_low',
    'complexity_threshold_low',
    'complexity_threshold_moderate',
    'complexity_threshold_high',
    'project_size_micro_max_effort',
    'project_size_small_max_effort',
    'project_size_medium_max_effort',
    'project_size_large_max_effort',
    'readiness_required_weight',
    'readiness_profile_weight',
  ]) {
    assert.match(repository, new RegExp(key));
  }
  assert.match(repository, /getNumberSetting/);
});

test('Project Estimator: internal commercial model remains behind authenticated admin API', () => {
  const adminApi = read('app/api/v1/admin/project-estimator/route.ts');
  const admin = read('lib/project-estimator/admin.ts');
  const publicRoute = read('app/api/v1/project-estimator/calculate/route.ts');
  assert.match(adminApi, /adminSessionFromRequest/);
  assert.match(adminApi, /action === 'commercial'/);
  assert.match(admin, /updateEstimateCommercial/);
  assert.match(admin, /estimate_commercials/);
  assert.doesNotMatch(publicRoute, /estimate_commercials|resourceCost|thirdPartyCost|marginPct/);
});

test('Project Estimator: funnel analytics are based on persisted operational events', () => {
  const repository = read('lib/project-estimator/repository.ts');
  const admin = read('lib/project-estimator/admin.ts');
  const migration = read('migrations/0005_project_estimator_rfq.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS estimator_events/);
  assert.match(repository, /ESTIMATOR_STARTED/);
  assert.match(repository, /ESTIMATE_CALCULATED/);
  assert.match(repository, /RFQ_GENERATED/);
  assert.match(repository, /RFQ_SUBMITTED/);
  assert.match(admin, /estimateConversionPct/);
  assert.match(admin, /topServices/);
  assert.match(admin, /topIndustries/);
});

test('Project Estimator: service recommendations are configurable and exposed without auto-changing scope', () => {
  const migration = read('migrations/0005_project_estimator_rfq.sql');
  const admin = read('lib/project-estimator/admin.ts');
  const page = read('app/tools/project-estimator/page.tsx');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS service_dependencies/);
  assert.match(admin, /upsertServiceDependency/);
  assert.match(page, /Recommended RTI Services/);
  assert.match(page, /do not change the selected project scope automatically/);
});



test('Project Estimator: server validates answer types and option allowlists before persistence', () => {
  const sessionApi = read('app/api/v1/project-estimator/session/route.ts');
  const repository = read('lib/project-estimator/repository.ts');
  assert.match(sessionApi, /validateEstimatorSessionInput/);
  assert.match(repository, /Unknown estimator question/);
  assert.match(repository, /Invalid option submitted/);
  assert.match(repository, /estimator_question_options/);
});

test('Project Estimator: Solution Finder handoff is persisted as source context', () => {
  const page = read('app/tools/project-estimator/page.tsx');
  const repository = read('lib/project-estimator/repository.ts');
  const migration = read('migrations/0005_project_estimator_rfq.sql');
  assert.match(page, /rti\.enterprise-solution-finder\.rfq-handoff\.v1/);
  assert.match(page, /sourceContext/);
  assert.match(repository, /source_context_json/);
  assert.match(migration, /source_context_json TEXT/);
});


test('Project Estimator: public and admin repositories use the shared cross-runtime database adapter', () => {
  for (const file of [
    'lib/project-estimator/repository.ts',
    'lib/project-estimator/admin.ts',
    'lib/project-estimator/attachments.ts',
  ]) {
    const source = read(file);
    assert.match(source, /getRuntimeDatabase/);
    assert.doesNotMatch(source, /@\/lib\/server\/database/);
    assert.doesNotMatch(source, /\bgetDatabase\b/);
  }
});

test('Project Estimator: Cloudflare runtime bundles migration 0005 and exposes readiness tables', () => {
  const registry = read('lib/server/runtime-migration-registry.ts');
  const runtimeMigrations = read('lib/server/runtime-migrations.ts');
  assert.match(registry, /0005_project_estimator_rfq\.sql/);
  assert.match(registry, /CREATE TABLE IF NOT EXISTS estimator_sessions/);
  assert.match(runtimeMigrations, /projectEstimator/);
  assert.match(runtimeMigrations, /estimatorServices/);
  assert.match(runtimeMigrations, /rfqVersions/);
});

test('Project Estimator: async capability checks are awaited by public routes', () => {
  for (const file of [
    'app/api/v1/project-estimator/calculate/route.ts',
    'app/api/v1/project-estimator/rfq/route.ts',
    'app/api/v1/project-estimator/rfq/[id]/route.ts',
    'app/api/v1/project-estimator/rfq/[id]/submit/route.ts',
    'app/api/v1/project-estimator/rfq/[id]/attachments/route.ts',
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /if \(!verify(?:EstimatorSession|Rfq)Access\(/);
  }
});

test('Project Estimator: Cloudflare attachment upload fails closed until object storage is configured', () => {
  const attachments = read('lib/project-estimator/attachments.ts');
  assert.match(attachments, /db\.kind !== 'node-sqlite'/);
  assert.match(attachments, /configured object storage on Cloudflare/);
  assert.match(attachments, /await import\('node:fs\/promises'\)/);
  assert.doesNotMatch(attachments, /^import .*node:fs/m);
});

test('Project Estimator: branded RFQ PDF is generated server-side behind capability access', () => {
  const pdf = read('lib/project-estimator/pdf.ts');
  const route = read('app/api/v1/project-estimator/rfq/[id]/pdf/route.ts');
  assert.match(pdf, /buildRfqPdf/);
  assert.match(pdf, /Riset Teknologi Indonesia/);
  assert.match(route, /verifyRfqAccess/);
  assert.match(route, /application\/pdf/);
  assert.match(route, /Content-Disposition/);
  assert.match(route, /X-RTI-Resume-Token/i);
});

test('Project Estimator: supporting-document download verifies capability and stored SHA-256 integrity', () => {
  const attachments = read('lib/project-estimator/attachments.ts');
  const route = read('app/api/v1/project-estimator/rfq/[id]/attachments/[attachmentId]/route.ts');
  assert.match(attachments, /readRfqAttachment/);
  assert.match(attachments, /integrity verification failed/);
  assert.match(attachments, /sha256 !== row\.sha256/);
  assert.match(route, /verifyRfqAccess/);
  assert.match(route, /X-Content-Type-Options/);
});

test('Project Estimator: explicit RFQ email action uses registered contact and cross-runtime database adapter', () => {
  const notifications = read('lib/project-estimator/notifications.ts');
  const route = read('app/api/v1/project-estimator/rfq/[id]/email/route.ts');
  const page = read('app/tools/project-estimator/page.tsx');
  assert.match(notifications, /getRuntimeDatabase/);
  assert.doesNotMatch(notifications, /getDatabase/);
  assert.match(notifications, /sendCustomerRfqCopy/);
  assert.match(notifications, /c\.email AS customer_email/);
  assert.match(route, /verifyRfqAccess/);
  assert.match(route, /project-rfq-email-copy/);
  assert.match(page, /Email RFQ/);
  assert.match(page, /Download PDF/);
});

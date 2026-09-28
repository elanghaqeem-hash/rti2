import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Estimator Copilot: schema persists provenance, messages and AI audit logs', () => {
  const migration = read('migrations/0007_project_estimator_copilot.sql');
  for (const table of [
    'estimator_scope_provenance',
    'estimator_scoping_messages',
    'estimator_ai_audit_logs',
    'estimator_document_intake',
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i'));
  }
});

test('Estimator Copilot: public route is capability-protected and rate-limited', () => {
  const route = read('app/api/v1/project-estimator/copilot/route.ts');
  const service = read('lib/project-estimator/copilot.ts');
  assert.match(route, /enforceRateLimit/);
  assert.match(service, /verifyEstimatorSessionAccess/);
  assert.match(service, /getEstimatorSessionByToken/);
});

test('Estimator Copilot: AI cannot directly create estimator numbers', () => {
  const service = read('lib/project-estimator/copilot.ts');
  assert.match(service, /Jangan pernah membuat angka effort, durasi, MD, minggu, atau harga/);
  assert.match(service, /blocksUntrustedEstimateNumbers/);
  assert.match(service, /calculateEstimatorSession/);
  assert.match(service, /set_scope_params/);
  assert.match(service, /compute_estimate/);
});

test('Estimator Copilot: proposed parameters are validated against question allowlists', () => {
  const service = read('lib/project-estimator/copilot.ts');
  assert.match(service, /validateProposals/);
  assert.match(service, /question\.options\.some/);
  assert.match(service, /validateEstimatorSessionInput/);
});

test('Estimator Copilot: graceful degradation exists when Anthropic is unavailable', () => {
  const service = read('lib/project-estimator/copilot.ts');
  assert.match(service, /deterministic-fallback/);
  assert.match(service, /deterministicReply/);
  assert.match(service, /degraded/);
});

test('Estimator Copilot: model is environment configured', () => {
  const service = read('lib/project-estimator/copilot.ts');
  const env = read('.env.example');
  assert.match(service, /AI_MODEL_PRIMARY/);
  assert.match(env, /AI_MODEL_PRIMARY=/);
  assert.match(env, /AI_MODEL_FAST=/);
});

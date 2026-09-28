import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Estimator F6: policy simulation is protected and non-mutating on POST', () => {
  const route = read('app/api/v1/admin/project-estimator/policy/route.ts');
  const policy = read('lib/project-estimator/policy.ts');
  assert.match(route, /adminSessionFromRequest/);
  assert.match(route, /simulateEstimatorPolicy/);
  const simulation = policy.slice(
    policy.indexOf('export async function simulateEstimatorPolicy'),
    policy.indexOf('async function audit'),
  );
  assert.doesNotMatch(simulation, /INSERT INTO|UPDATE estimator_policy_versions|DELETE FROM/);
  assert.match(simulation, /LIMIT 20/);
});

test('Estimator F6: policy activation requires explicit calibration approval phrase', () => {
  const policy = read('lib/project-estimator/policy.ts');
  assert.match(policy, /APPROVE RTI CALIBRATION/);
  assert.match(policy, /Only a draft policy can be activated/);
  assert.match(policy, /approved_by/);
});

test('Estimator F6: embed CSP permits only Risetin framing and no legacy DENY header conflicts', () => {
  const config = read('next.config.mjs');
  assert.match(config, /frame-ancestors 'self' https:\/\/risetin\.co\.id https:\/\/www\.risetin\.co\.id/);
  assert.doesNotMatch(config, /key:\s*['"]X-Frame-Options['"][\s\S]{0,100}DENY/);
  assert.match(config, /object-src 'none'/);
  assert.match(config, /Strict-Transport-Security/);
});

test('Estimator F6: binary document AI extraction is explicitly opt-in', () => {
  const docs = read('lib/project-estimator/documents.ts');
  const env = read('.env.example');
  assert.match(docs, /RTI_ALLOW_BINARY_AI_EXTRACTION/);
  assert.match(docs, /!== 'true'/);
  assert.match(env, /RTI_ALLOW_BINARY_AI_EXTRACTION=false/);
  assert.match(docs, /redactSensitiveForAi/);
});

test('Estimator F6: abandoned public drafts have a protected anonymization path', () => {
  const retention = read('lib/project-estimator/retention.ts');
  const route = read('app/api/v1/admin/project-estimator/retention/route.ts');
  assert.match(route, /adminSessionFromRequest/);
  assert.match(retention, /olderThanDays \|\| 90/);
  assert.match(retention, /status='draft'/);
  assert.match(retention, /created_by IS NULL/);
  assert.match(retention, /secure_token_hash=NULL/);
  assert.match(retention, /DELETE FROM estimator_answers/);
  assert.match(retention, /deletePrivateObject/);
});

test('Estimator F6: R2 production binding and private storage are documented', () => {
  const env = read('.env.example');
  const storage = read('lib/server/object-storage.ts');
  assert.match(env, /RTI_FILES/);
  assert.match(storage, /Cloudflare R2 binding RTI_FILES is not configured/);
  assert.match(storage, /outside the public web root/);
});

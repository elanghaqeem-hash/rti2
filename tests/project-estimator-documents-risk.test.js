import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Estimator F4: document intake is capability protected and rate limited', () => {
  const route = read('app/api/v1/project-estimator/documents/route.ts');
  assert.match(route, /verifyEstimatorSessionAccess/);
  assert.match(route, /enforceRateLimit/);
  assert.match(route, /storeAndParseScopingDocument/);
});

test('Estimator F4: document parser handles prompt-injection as a risk flag', () => {
  const docs = read('lib/project-estimator/documents.ts');
  assert.match(docs, /PROMPT_INJECTION_IN_DOC/);
  assert.match(docs, /Document content is untrusted data/i);
  assert.match(docs, /securityFlags/);
});

test('Estimator F4: document-derived parameters use allowlisted values and provenance', () => {
  const docs = read('lib/project-estimator/documents.ts');
  assert.match(docs, /question\.options\.some/);
  assert.match(docs, /validateEstimatorSessionInput/);
  assert.match(docs, /estimator_scope_provenance/);
  assert.match(docs, /source='document'/);
});

test('Estimator F4: private storage supports R2 and fails closed when binding is missing', () => {
  const storage = read('lib/server/object-storage.ts');
  assert.match(storage, /RTI_FILES/);
  assert.match(storage, /Cloudflare R2 binding RTI_FILES is not configured/);
  assert.match(storage, /putPrivateObject/);
  assert.match(storage, /getPrivateObject/);
});

test('Estimator F4: risk engine is deterministic and does not depend on an LLM', () => {
  const risk = read('lib/project-estimator/risk.ts');
  assert.match(risk, /SCOPE_CREEP_RISK/);
  assert.match(risk, /CORE_INTEGRATION/);
  assert.match(risk, /REGULATED_DATA/);
  assert.match(risk, /UNREALISTIC_TIMELINE/);
  assert.match(risk, /BUDGET_MISMATCH/);
  assert.doesNotMatch(risk, /ANTHROPIC_API_KEY|OPENAI_API_KEY|generateAiWithFailover/);
});

test('Estimator F4: calculation API returns the refreshed public risk register', () => {
  const route = read('app/api/v1/project-estimator/calculate/route.ts');
  assert.match(route, /refreshEstimatorRiskFlags/);
  assert.match(route, /riskFlags/);
});

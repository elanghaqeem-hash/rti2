import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Estimator F5: Studio migration includes BoQ, quotation, approval and actual tables', () => {
  const migration = read('migrations/0008_project_estimator_studio_quotation.sql');
  for (const table of [
    'estimator_boq_v2',
    'estimator_quotations',
    'estimator_quotation_approvals',
    'estimator_approval_rules_v2',
    'estimator_actuals',
    'estimator_client_messages',
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i'));
  }
});

test('Estimator F5: Studio API requires admin session', () => {
  const route = read('app/api/v1/admin/project-estimator/studio/[sessionId]/route.ts');
  assert.match(route, /adminSessionFromRequest/);
  assert.match(route, /Admin authentication required/);
});

test('Estimator F5: internal Studio path is protected by middleware', () => {
  const middleware = read('middleware.ts');
  assert.match(middleware, /pathname\.startsWith\('\/studio\/'\)/);
  assert.match(middleware, /'\/studio\/:path\*'/);
});

test('Estimator F5: quotation pricing uses deterministic pricing bands and floor approval guard', () => {
  const studio = read('lib/project-estimator/studio.ts');
  assert.match(studio, /computePricingBands/);
  assert.match(studio, /finalPrice < params\.floorPrice/);
  assert.match(studio, /discountPct > 15/);
  assert.match(studio, /1_000_000_000/);
  assert.match(studio, /approval_level_required/);
});

test('Estimator F5: client portal serializer does not expose internal pricing bands', () => {
  const studio = read('lib/project-estimator/studio.ts');
  const start = studio.indexOf('export async function getPortalSession');
  const end = studio.indexOf('export async function getQuotationPdfData');
  const portal = studio.slice(start, end);
  assert.match(portal, /final_price/);
  assert.doesNotMatch(portal, /internal_cost|floor_price|standard_price|premium_price|gross_margin|cost_usd/);
});

test('Estimator F5: quotation PDF requires admin session or portal capability access', () => {
  const route = read('app/api/v1/project-estimator/quotation/[id]/pdf/route.ts');
  assert.match(route, /adminSessionFromRequest/);
  assert.match(route, /verifyPortalQuotationAccess/);
  assert.match(route, /application\/pdf/);
});

test('Estimator F5: portal messages are rate limited and capability protected', () => {
  const route = read('app/api/v1/project-estimator/portal/route.ts');
  const studio = read('lib/project-estimator/studio.ts');
  assert.match(route, /enforceRateLimit/);
  assert.match(studio, /getEstimatorSessionByToken/);
  assert.match(studio, /estimator_client_messages/);
});

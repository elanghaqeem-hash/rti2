import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePricingBands,
  computeSwdevMd,
  computeVaptMobileMd,
  computeVaptWebMd,
  tshirtFromMd,
  uncertaintyFactor,
} from '../packages/engine/index.js';

test('Estimator v2 golden: VAPT Web matches specification', () => {
  const md = computeVaptWebMd({
    complexity: 'Complex',
    roles: 4,
    endpoints: 60,
    box: 'Grey',
    auth: 'SSO',
    compliance: 'regulator',
  });
  assert.equal(md, 21);

  const hr = (4 * 1_600_000) + (6 * 2_200_000) + (8 * 1_200_000) + (3 * 600_000);
  assert.equal(hr, 31_000_000);
  const pricing = computePricingBands({ internalCost: hr, floorMargin: 0.20 });
  assert.equal(pricing.floor, 38_750_000);
});

test('Estimator v2 golden: VAPT Mobile reference scenario is 14 MD and T-shirt M', () => {
  const md = computeVaptMobileMd({
    apps: 1,
    platform: 'Dual',
    feature: 'Payment',
    backend: 'dengan',
  });
  assert.equal(md, 14);
  assert.equal(tshirtFromMd(md), 'M');
});

test('Estimator v2 golden: SWDEV ordering matches specification', () => {
  const md = computeSwdevMd({
    features: ['S','S','S','S','M','M','M','C'],
    integrations: ['standar','standar'],
    roles: 3,
    migration: 0,
    design: 'final',
    platform: 'web',
    multiTenant: false,
    securityBaseline: true,
    compliance: false,
    highAvailability: false,
  });
  assert.equal(md, 91);
  assert.equal(tshirtFromMd(md), 'XXL');
});

test('Estimator v2 guard: pricing bands never put Standard/Premium below Floor', () => {
  const pricing = computePricingBands({
    internalCost: 100_000_000,
    floorMargin: 0.20,
    segmentMultiplier: 0.80,
    marketAdjustment: 0.95,
    premiumFactor: 1.25,
  });
  assert.ok(pricing.standard >= pricing.floor);
  assert.ok(pricing.premium >= pricing.standard);
});

test('Estimator v2 confidence uncertainty thresholds are deterministic', () => {
  assert.equal(uncertaintyFactor(90), 0.10);
  assert.equal(uncertaintyFactor(80), 0.20);
  assert.equal(uncertaintyFactor(60), 0.35);
  assert.equal(uncertaintyFactor(40), 0.50);
});

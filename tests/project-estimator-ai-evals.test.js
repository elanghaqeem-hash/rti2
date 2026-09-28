import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  containsUntrustedEstimateNumbers,
  detectPromptInjection,
  redactSensitiveForAi,
} from '../packages/engine/ai-guardrails.js';

const root = process.cwd();
const scenarios = JSON.parse(
  fs.readFileSync(path.join(root, 'tests/ai-evals/scenarios.json'), 'utf8'),
);

test('Estimator AI eval set contains at least 30 synthetic scenarios', () => {
  assert.ok(Array.isArray(scenarios));
  assert.ok(scenarios.length >= 30);
});

test('Estimator AI eval: prompt injection detection is 100% for required synthetic cases', () => {
  const expected = scenarios.filter((item) => item.expectPromptInjection);
  assert.ok(expected.length >= 5);
  for (const item of expected) {
    assert.equal(detectPromptInjection(item.input), true, item.id);
  }
});

test('Estimator AI eval: benign scoping content is not falsely tagged as prompt injection', () => {
  const benign = scenarios.filter((item) => !item.expectPromptInjection);
  for (const item of benign) {
    assert.equal(detectPromptInjection(item.input), false, item.id);
  }
});

test('Estimator AI eval: sensitive identifiers are redacted before text-model mapping', () => {
  const expected = scenarios.filter((item) => item.expectSensitiveRedaction);
  assert.ok(expected.length >= 3);
  for (const item of expected) {
    const redacted = redactSensitiveForAi(item.input);
    assert.match(redacted, /\[REDACTED_/);
    assert.notEqual(redacted, item.input, item.id);
  }
});

test('Estimator AI eval: untrusted effort/duration/price numbers are blocked', () => {
  const expected = scenarios.filter((item) => item.expectEstimateNumberBlock);
  assert.ok(expected.length >= 4);
  for (const item of expected) {
    assert.equal(containsUntrustedEstimateNumbers(item.input), true, item.id);
  }
});

test('Estimator AI eval: ordinary scope counts are not treated as model-generated estimates', () => {
  const safe = scenarios.filter(
    (item) =>
      !item.expectEstimateNumberBlock &&
      !item.expectPromptInjection &&
      !item.expectSensitiveRedaction,
  );
  for (const item of safe) {
    assert.equal(containsUntrustedEstimateNumbers(item.input), false, item.id);
  }
});

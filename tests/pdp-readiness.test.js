import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('PDP readiness: static seven-question checklist is replaced by database-backed engine', () => {
  const page = read('app/tools/pdp-readiness/page.tsx');
  const repository = read('lib/pdp/repository.ts');
  const migration = read('migrations/0003_pdp_readiness.sql');

  assert.doesNotMatch(page, /PDP_QUESTIONS/);
  assert.match(page, /PdpReadinessClient/);
  assert.match(repository, /pdp_questions/);
  assert.match(repository, /listPdpQuestions/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS pdp_questions/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS pdp_assessments/i);
});

test('PDP readiness: the model includes all 20 requested diagnostic domains', () => {
  const seed = read('lib/pdp/seed.ts');
  for (const code of [
    'GOV','MAP','ROPA','LAW','CONSENT','RIGHTS','NOTICE','RET','DPIA','DPO',
    'TPRM','SEC','BREACH','XFER','PBD','HR','MKT','CHILD','AWARE','AUDIT',
  ]) {
    assert.match(seed, new RegExp("code: '" + code + "'"));
  }
  assert.match(seed, /comprehensiveQuestions/);
  assert.match(seed, /quickQuestions/);
});

test('PDP readiness: scoring is weighted and database-parameterized', () => {
  const scoring = read('lib/pdp/scoring.ts');
  const repository = read('lib/pdp/repository.ts');
  const migration = read('migrations/0003_pdp_readiness.sql');

  assert.match(scoring, /domainWeight/);
  assert.match(scoring, /confidenceFactor/);
  assert.match(scoring, /evidenceFactor/);
  assert.match(scoring, /criticality/);
  assert.match(scoring, /params\.scoring/);
  assert.match(repository, /getPdpScoringConfig/);
  assert.match(migration, /pdp_scoring_parameters/);
  assert.match(migration, /pdp_maturity_levels/);
});

test('PDP readiness: guest assessments use hashed resume tokens and protected persistence', () => {
  const repository = read('lib/pdp/repository.ts');
  const assessmentApi = read('app/api/tools/pdp-readiness/assessment/route.ts');

  assert.match(repository, /randomBytes\(32\)/);
  assert.match(repository, /createHash\('sha256'\)/);
  assert.match(repository, /resume_token_hash/);
  assert.doesNotMatch(repository, /resume_token\s+TEXT/);
  assert.match(assessmentApi, /Authorization/);
  assert.match(assessmentApi, /enforceRateLimit/);
});

test('PDP readiness: evidence upload is restricted, scanned and private', () => {
  const evidenceApi = read('app/api/tools/pdp-readiness/evidence/route.ts');
  const repository = read('lib/pdp/repository.ts');

  assert.match(evidenceApi, /getPdpEvidenceRules/);
  assert.match(evidenceApi, /validateMagic/);
  assert.match(evidenceApi, /PDP_CLAMSCAN_COMMAND/);
  assert.match(evidenceApi, /PDP_REQUIRE_MALWARE_SCAN/);
  assert.match(evidenceApi, /mode: 0o600/);
  assert.match(evidenceApi, /createHash\('sha256'\)/);
  assert.match(repository, /pdp_evidence_types/);
});

test('PDP readiness: critical findings, DPIA and DPO are separate diagnostics', () => {
  const scoring = read('lib/pdp/scoring.ts');
  assert.match(scoring, /criticalFindings/);
  assert.match(scoring, /DPIA Likely Required/);
  assert.match(scoring, /Further Assessment Required/);
  assert.match(scoring, /Trigger Identified/);
  assert.match(scoring, /Further Legal Review Recommended/);
  assert.match(scoring, /not a certification/i);
});

test('PDP readiness: AI analysis is grounded and cannot be used as final legal conclusion', () => {
  const ai = read('app/api/tools/pdp-readiness/ai/route.ts');
  assert.match(ai, /getPdpAiPrompt/);
  assert.match(ai, /Jangan menyatakan organisasi pasti patuh\/tidak patuh/);
  assert.match(ai, /Jangan mengarang nomor pasal/);
  assert.match(ai, /REQUIRES HUMAN VALIDATION/);
  assert.match(ai, /allowedRegulatoryContext/);
});

test('PDP readiness: admin CMS is session protected and exposes configuration CRUD', () => {
  const api = read('app/api/admin/pdp-readiness/route.ts');
  const page = read('app/admin/pdp-readiness/page.tsx');

  assert.match(api, /isAdminRequest/);
  assert.match(api, /createAdminPdpEntity/);
  assert.match(api, /updateAdminPdpEntity/);
  assert.match(api, /deactivateAdminPdpEntity/);
  assert.match(page, /Assessment Questions/);
  assert.match(page, /Scoring Parameters/);
  assert.match(page, /AI Prompt Configuration/);
  assert.match(page, /Report Templates/);
});

test('PDP readiness: assessment supports export, delete and executive PDF', () => {
  const assessmentApi = read('app/api/tools/pdp-readiness/assessment/route.ts');
  const exportApi = read('app/api/tools/pdp-readiness/export/route.ts');
  const reportApi = read('app/api/tools/pdp-readiness/report/route.ts');
  const report = read('lib/pdp/report.ts');

  assert.match(assessmentApi, /export async function DELETE/);
  assert.match(exportApi, /Content-Disposition/);
  assert.match(reportApi, /application\/pdf/);
  assert.match(report, /Executive Summary/);
  assert.match(report, /DPIA Readiness/);
  assert.match(report, /Priority Remediation/);
});

test('PDP readiness: public PDP APIs are protected by rate limiting', () => {
  for (const file of [
    'app/api/tools/pdp-readiness/assessment/route.ts',
    'app/api/tools/pdp-readiness/score/route.ts',
    'app/api/tools/pdp-readiness/ai/route.ts',
    'app/api/tools/pdp-readiness/evidence/route.ts',
    'app/api/tools/pdp-readiness/report/route.ts',
    'app/api/tools/pdp-readiness/export/route.ts',
  ]) {
    assert.match(read(file), /enforceRateLimit/, file + ' must enforce rate limiting');
  }
});

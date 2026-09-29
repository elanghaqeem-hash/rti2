import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');

test('Estimator F6 hardening: admin login and internal mutations are origin protected',()=>{
  const protection=read('lib/security/request-protection.ts');
  assert.match(protection,/enforceSameOriginMutation/);
  for(const file of [
    'app/api/admin/auth/login/route.ts',
    'app/api/v1/admin/project-estimator/route.ts',
    'app/api/v1/admin/project-estimator/policy/route.ts',
    'app/api/v1/admin/project-estimator/studio/[sessionId]/route.ts',
  ]){
    assert.match(read(file),/enforceSameOriginMutation/);
  }
  assert.match(read('app/api/admin/auth/login/route.ts'),/bucket: 'admin-login'/);
});

test('Estimator F6 hardening: CSP permits only same-origin application framing',()=>{
  const config=read('next.config.mjs');
  assert.match(config,/X-Frame-Options[\s\S]*SAMEORIGIN/);
  assert.match(config,/frame-ancestors 'self'/);
  assert.match(config,/frame-src 'self' https:\/\/challenges\.cloudflare\.com/);
  assert.match(config,/Cross-Origin-Resource-Policy/);
  assert.doesNotMatch(config,/frame-ancestors 'none'/);
});

test('Estimator F6 hardening: private R2 storage is configured for Cloudflare',()=>{
  const wrangler=read('wrangler.jsonc');
  assert.match(wrangler,/"binding": "RTI_FILES"/);
  assert.match(wrangler,/"bucket_name": "rti-files-production"/);
  const attachments=read('lib/project-estimator/attachments.ts');
  assert.match(attachments,/putPrivateObject/);
  assert.match(attachments,/getPrivateObject/);
  assert.doesNotMatch(attachments,/db\.kind !== 'node-sqlite'/);
});

test('Estimator F6 privacy: external raw PDF/image AI extraction is opt-in and local text is redacted',()=>{
  const docs=read('lib/project-estimator/documents.ts');
  const env=read('.env.example');
  assert.match(docs,/RTI_AI_DOCUMENT_EXTERNAL_EXTRACTION_ENABLED/);
  assert.match(docs,/redactSensitiveText/);
  assert.match(docs,/REDACTED_NIK_OR_ACCOUNT/);
  assert.match(env,/RTI_AI_DOCUMENT_EXTERNAL_EXTRACTION_ENABLED=false/);
});

test('Estimator F6 privacy: abandoned public sessions have 90-day anonymization controls',()=>{
  const migration=read('migrations/0010_project_estimator_privacy_retention.sql');
  const retention=read('lib/project-estimator/retention.ts');
  const route=read('app/api/v1/admin/project-estimator/retention/route.ts');
  assert.match(migration,/public_session_retention_days[^\n]*'90'/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS estimator_retention_runs/);
  assert.match(retention,/ANONYMIZE EXPIRED SESSIONS/);
  assert.match(retention,/secure_token_hash=NULL/);
  assert.match(retention,/deletePrivateObject/);
  assert.match(route,/adminSessionFromRequest/);
  assert.match(route,/enforceSameOriginMutation/);
});

test('Estimator F6 production preflight requires D1, R2 and security/privacy contracts',()=>{
  const script=read('scripts/check-estimator-production.mjs');
  assert.match(script,/RTI_DB/);
  assert.match(script,/RTI_FILES/);
  assert.match(script,/0010_project_estimator_privacy_retention\.sql/);
  assert.match(script,/frame-ancestors 'self'/);
  assert.match(script,/RTI_AI_DOCUMENT_EXTERNAL_EXTRACTION_ENABLED=false/);
});

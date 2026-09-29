import { readFileSync } from 'node:fs';

function fail(message){
  console.error('PRODUCTION PREFLIGHT BLOCKED:',message);
  process.exitCode=1;
}

const config=readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8');
const nextConfig=readFileSync(new URL('../next.config.mjs',import.meta.url),'utf8');
const migrations=readFileSync(new URL('../lib/server/migrations.ts',import.meta.url),'utf8');
const envExample=readFileSync(new URL('../.env.example',import.meta.url),'utf8');

const d1=config.match(/"d1_databases"\s*:\s*\[([\s\S]*?)\]/)?.[1]||'';
if(!/"binding"\s*:\s*"RTI_DB"/.test(d1))fail('wrangler.jsonc must contain a D1 binding named RTI_DB.');
if(!/"database_id"\s*:\s*"[0-9a-f-]{36}"/i.test(d1))fail('RTI_DB needs the real Cloudflare D1 database_id.');

const r2=config.match(/"r2_buckets"\s*:\s*\[([\s\S]*?)\]/)?.[1]||'';
if(!/"binding"\s*:\s*"RTI_FILES"/.test(r2))fail('wrangler.jsonc must contain an R2 binding named RTI_FILES.');
const bucket=r2.match(/"bucket_name"\s*:\s*"([^"]+)"/)?.[1]||'';
if(!bucket||/placeholder|change-me|set-/i.test(bucket))fail('RTI_FILES requires a real production R2 bucket name.');

for(const migration of [
  '0006_project_estimator_ai_scoping.sql',
  '0007_project_estimator_copilot.sql',
  '0008_project_estimator_studio_quotation.sql',
  '0009_project_estimator_policy_governance.sql',
  '0010_project_estimator_privacy_retention.sql',
]){
  if(!migrations.includes(migration))fail('Migration registry missing '+migration);
}

if(!nextConfig.includes("frame-ancestors 'self'"))fail('CSP must permit same-origin /estimator iframe embedding.');
if(!nextConfig.includes("X-Content-Type-Options"))fail('Security headers are incomplete.');
if(!envExample.includes('RTI_MALWARE_SCAN_URL='))fail('Malware scanner configuration contract is missing.');
if(!envExample.includes('RTI_AI_DOCUMENT_EXTERNAL_EXTRACTION_ENABLED=false'))fail('External AI document privacy gate must default to false.');

if(!process.exitCode){
  console.log('Production preflight contract passed.');
  console.log('Resource bindings expected: RTI_DB (D1), RTI_FILES (private R2).');
  console.log('Runtime secrets/vars still must be configured in the target environment; they are intentionally not stored in the repository.');
}

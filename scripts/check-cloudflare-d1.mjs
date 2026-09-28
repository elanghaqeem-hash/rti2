import { readFileSync } from 'node:fs';

const config = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const bindings = config.match(/"d1_databases"\s*:\s*\[([\s\S]*?)\]/)?.[1] || '';
const hasBinding = /"binding"\s*:\s*"RTI_DB"/.test(bindings);
const hasDatabaseId = /"database_id"\s*:\s*"[0-9a-f-]{36}"/i.test(bindings);

if (!hasBinding || !hasDatabaseId) {
  console.error('Cloudflare deployment blocked: wrangler.jsonc needs a D1 database binding RTI_DB with its real database_id.');
  console.error('Create or select the production D1 database, add its binding, then apply migrations before deploying.');
  process.exitCode = 1;
} else {
  console.log('Cloudflare D1 binding RTI_DB is configured.');
}

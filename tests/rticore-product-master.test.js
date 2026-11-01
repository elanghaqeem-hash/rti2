import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const sql = readFileSync(new URL('../migrations/0011_rticore_master_products.sql', import.meta.url), 'utf8');
const registry = readFileSync(new URL('../lib/server/runtime-migration-registry.ts', import.meta.url), 'utf8');
const api = readFileSync(new URL('../app/api/admin/products/route.ts', import.meta.url), 'utf8');
const publicApi = readFileSync(new URL('../app/api/products/route.ts', import.meta.url), 'utf8');

function db() {
  const instance = new DatabaseSync(':memory:');
  instance.exec(sql);
  return instance;
}
test('product master migrates 32 official products, 81 scopes and six catalog families', () => {
  const database = db();
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM rti_product_categories').get().n, 6);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM rti_product_categories WHERE is_supporting = 0').get().n, 5);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM rti_products').get().n, 32);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM rti_product_scopes').get().n, 81);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM rti_products WHERE price_amount IS NOT NULL').get().n, 0);
  assert.equal(database.prepare('PRAGMA foreign_key_check').all().length, 0);
  assert.ok(database.prepare('SELECT sku FROM rti_products WHERE sku = ?').get('RTI-OFF-002'));
  database.close();
});
test('product migration remains idempotent and respects operator edits', () => {
  const database=db();
  database.prepare('UPDATE rti_products SET name = ? WHERE sku = ?').run('Custom Pentest Name','RTI-OFF-002');
  database.prepare('UPDATE rti_products SET is_active = 0 WHERE sku = ?').run('RTI-DEF-001');
  database.exec(sql);
  assert.equal(database.prepare('SELECT name FROM rti_products WHERE sku = ?').get('RTI-OFF-002').name,'Custom Pentest Name');
  assert.equal(database.prepare('SELECT is_active FROM rti_products WHERE sku = ?').get('RTI-DEF-001').is_active,0);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM rti_products').get().n,32);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM rti_product_scopes').get().n,81);
  database.close();
});
test('read/write product API enforces administrator and fails closed on DB errors', () => {
  assert.match(api,/adminSessionFromRequest\(req\)/);
  assert.match(api,/if\(!session\)return unauthorized\(\)/);
  assert.match(api,/status:503/);
  assert.match(publicApi,/status:503/);
  assert.match(api,/findProduct|saveMasterProduct/);
  assert.match(registry,/'?0011_rticore_master_products\.sql'?/);
});
test('product master UI is linked from admin setup', () => {
  const system = readFileSync(new URL('../app/admin/system/page.tsx', import.meta.url), 'utf8');
  assert.match(system,/href="\/admin\/products"/);
  assert.match(system,/productMaster/);
  const form = readFileSync(new URL('../app/contact/page.tsx', import.meta.url), 'utf8');
  assert.match(form,/fetch\('\/api\/products'/);
  assert.match(form,/chosenMasterProduct/);
});

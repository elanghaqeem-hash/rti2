import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const a=readFileSync(new URL('../migrations/0011_rticore_master_products.sql',import.meta.url),'utf8');
const b=readFileSync(new URL('../migrations/0012_rticore_sector_portfolios.sql',import.meta.url),'utf8');
const extension=JSON.parse(readFileSync(new URL('../data/rticore-portfolio-extension-2026.json',import.meta.url),'utf8')).extension;
const create=()=>{const db=new DatabaseSync(':memory:');db.exec(a);db.exec(b);return db;};
test('42 new products extend RTICORE master to 74 products and 249 scopes',()=>{
  const db=create();
  assert.deepEqual(extension.map(x=>x.code),['TRN','DEV','TPR']);
  assert.equal(extension.reduce((a,g)=>a+g.products.length,0),42);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rti_product_categories').get().n,9);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rti_products').get().n,74);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rti_product_scopes').get().n,249);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rti_product_industries').get().n,150);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rti_products WHERE price_amount IS NOT NULL').get().n,0);
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  for (const family of ['TRN','DEV','TPR']) {
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rti_products WHERE category_code=?').get(family).n,14);
  }
  db.close();
});
test('new portfolios have real FSI, manufacturing, government and other classifications',()=>{
  const db=create();
  for (const sector of ['FSI','Manufacturing','Government','Other']) {
    assert.ok(db.prepare('SELECT COUNT(*) AS n FROM rti_product_industries WHERE industry_code=?').get(sector).n>0,sector);
  }
  for (const product of extension.flatMap(g=>g.products)) {
    assert.ok(product.name.length>5);
    assert.ok(product.scopes.length>=2);
    assert.ok(product.industries.length>=2);
    assert.ok(db.prepare('SELECT sku FROM rti_products WHERE sku=?').get(product.sku),product.sku);
  }
  db.close();
});
test('additive migration does not overwrite existing pricing, status or edited services',()=>{
  const db=create();
  db.prepare('UPDATE rti_products SET name=?,price_amount=?,is_active=? WHERE sku=?')
    .run('Customer-specific MES',48000000,0,'RTI-DEV-004');
  db.prepare('UPDATE rti_product_scopes SET name=? WHERE id=?')
    .run('Custom industrial scope','RTI-TPR-009-S01');
  db.exec(b);
  assert.equal(db.prepare('SELECT name FROM rti_products WHERE sku=?').get('RTI-DEV-004').name,'Customer-specific MES');
  assert.equal(db.prepare('SELECT price_amount FROM rti_products WHERE sku=?').get('RTI-DEV-004').price_amount,48000000);
  assert.equal(db.prepare('SELECT is_active FROM rti_products WHERE sku=?').get('RTI-DEV-004').is_active,0);
  assert.equal(db.prepare('SELECT name FROM rti_product_scopes WHERE id=?').get('RTI-TPR-009-S01').name,'Custom industrial scope');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rti_products').get().n,74);
  db.close();
});
test('Admin SKU validation includes three new product categories',()=>{
  const api=readFileSync(new URL('../app/api/admin/products/route.ts',import.meta.url),'utf8');
  assert.match(api,/TRN\|DEV\|TPR/);
  const repo=readFileSync(new URL('../lib/products/repository.ts',import.meta.url),'utf8');
  assert.match(repo,/rti_product_industries/);
  const catalog=readFileSync(new URL('../lib/server/runtime-migration-registry.ts',import.meta.url),'utf8');
  assert.match(catalog,/0012_rticore_sector_portfolios\.sql/);
});

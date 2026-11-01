import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const source = readFileSync(new URL('../demos/rticore-sales/worker.js', import.meta.url), 'utf8');
const start = source.indexOf('const APP_HTML=') + 'const APP_HTML='.length;
const end = source.indexOf(';\nconst USER=', start);
assert.ok(start > 20 && end > start, 'RTICORE HTML source must be present');
const html = JSON.parse(source.slice(start, end));
const inline = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
const encoded = inline.match(/^(?:let|const) SERVICE_CATALOG=(\[[^\n]+\]);$/m)?.[1];
assert.ok(encoded, 'RTI service catalog must be embedded in RTICORE');
const groups = JSON.parse(encoded);

test('RTICORE browser script remains syntactically valid', () => {
  assert.doesNotThrow(() => new Script(inline));
});

test('RTI Company Profile 2026 is mapped into five pillars and research support', () => {
  assert.equal(groups.filter(g => !g.supporting).length, 8);
  assert.equal(groups.filter(g => g.supporting).length, 1);
  assert.equal(groups.flatMap(g => g.products).length, 74);
  assert.equal(groups.flatMap(g => g.products.flatMap(p => p.details)).length, 249);
  assert.deepEqual(groups.slice(0, 5).map(g => g.pillar), [
    'Governance, Risk & Compliance',
    'Offensive Security',
    'Defensive Security',
    'Cyber Strategy & Advisory',
    'Talent & CyberTroops Academy',
  ]);
  const all = new Set();
  for (const group of groups) {
    assert.ok(group.products.length > 0);
    for (const product of group.products) {
      const key = group.pillar + '/' + product.name;
      assert.ok(!all.has(key), 'Duplicate catalog item: ' + key);
      all.add(key);
      assert.ok(product.details.length > 0, 'Missing scope: ' + key);
    }
  }
});

test('sales lead form dynamically selects pillar, product and scope', () => {
  for (const field of ['industry', 'pillar', 'service', 'detail']) {
    assert.ok(html.includes('name="' + field + '"'), field + ' must be selectable');
  }
  assert.match(inline, /function updateProducts\(f\)/);
  assert.match(inline, /function updateDetails\(f\)/);
  assert.match(inline, /findProduct\(x\.pillar,x\.service\)/);
  assert.match(inline, /data\.leads\.push\(\{id,company:x\.company,contact:x\.contact,industry:x\.industry,pillar:x\.pillar/);
  assert.doesNotMatch(inline, /opts\(\['VAPT','SOC\/MDR','Cyber GRC'/);
});

test('legacy lead labels and CSV exports remain supported', () => {
  assert.match(inline, /const LEGACY_PILLAR=/);
  assert.match(inline, /const pillarLabel=/);
  assert.match(inline, /let cols=\['Company','Contact','Industry','Pillar','SKU','Service','Detail'/);
  assert.match(inline, /\['catalog','Master Produk'\]/);
});

test('three new industry portfolios have unique SKU, sector mapping and subservices', () => {
  const sectors = new Set(['FSI','Manufacturing','Government','Other']);
  const additions = [
    ['Training Provider & Corporate Academy','TRN'],
    ['System Development & Digital Solutions','DEV'],
    ['Technology Provider & Infrastructure Solutions','TPR'],
  ];
  for (const [name,code] of additions) {
    const group=groups.find(x=>x.pillar===name);
    assert.ok(group,name);
    assert.equal(group.products.length,14);
    for (const product of group.products) {
      assert.match(product.sku,new RegExp('^RTI-'+code+'-[0-9]{3}$'));
      assert.ok(product.details.length>=2);
      assert.ok(product.industries.length>=2);
      for (const sector of product.industries) assert.ok(sectors.has(sector));
    }
  }
  assert.match(inline,/INDUSTRY_OPTIONS/);
  assert.match(inline,/industry==='ALL'/);
});

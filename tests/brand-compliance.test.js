import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const FORBIDDEN_STRING = 'PT Riset Teknologi Informasi';
const REQUIRED_LEGAL_STRING = 'PT Riset Teknologi Indonesia';

function scanDirectory(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(entry.name)) {
        scanDirectory(fullPath, fileList);
      }
    } else if (/\.(js|jsx|ts|tsx|json|md|html)$/.test(entry.name)) {
      if (!entry.name.includes('brand-compliance.test')) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

test('Brand Compliance: FORBIDDEN STRING "PT Riset Teknologi Informasi" must never appear', () => {
  const rootDir = process.cwd();
  const files = scanDirectory(rootDir);
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes(FORBIDDEN_STRING)) {
      violations.push(file);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Forbidden company name "${FORBIDDEN_STRING}" found in: \n${violations.join('\n')}`
  );
});

test('Brand Compliance: Legal config file contains exact legal name "PT Riset Teknologi Indonesia"', () => {
  const contactConfigPath = path.join(process.cwd(), 'lib', 'config', 'contact.ts');
  assert.ok(fs.existsSync(contactConfigPath), 'Contact config file exists');
  const content = fs.readFileSync(contactConfigPath, 'utf8');
  assert.ok(
    content.includes(REQUIRED_LEGAL_STRING),
    `Contact config must contain "${REQUIRED_LEGAL_STRING}"`
  );
});

test('Data Integrity: lead module must not contain volatile storage or sample lead records', () => {
  const leadModulePath = path.join(process.cwd(), 'lib', 'scoring', 'leads.ts');
  const content = fs.readFileSync(leadModulePath, 'utf8');

  assert.equal(
    /const\s+leadsStore\s*:/i.test(content),
    false,
    'Lead module must not use an in-memory leadsStore as persistence.'
  );
  assert.equal(
    /lead_sample_|realistic sample leads|Bank Mitraniaga|Finansial Solusi Nusantara/i.test(content),
    false,
    'Lead module must not ship sample/fake lead records.'
  );
});

test('Data Integrity: lead API must fail closed while database persistence is unavailable', () => {
  const apiPath = path.join(process.cwd(), 'app', 'api', 'leads', 'route.ts');
  const content = fs.readFileSync(apiPath, 'utf8');

  assert.ok(content.includes('status: 503'), 'Lead API must return 503 while DB is unavailable.');
  assert.ok(content.includes('leads: []'), 'Lead API must return an empty lead collection without DB.');
  assert.equal(
    /saveLead\(|getLeads\(/.test(content),
    false,
    'Lead API must not call non-database persistence functions.'
  );
});

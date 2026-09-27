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
      // Exclude this test file itself so checking the constant doesn't self-flag
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

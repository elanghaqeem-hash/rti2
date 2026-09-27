import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function source(path) {
  return readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}

test('admin routes are protected by middleware', () => {
  const middleware = source('middleware.ts');

  assert.match(middleware, /\/admin\/:path\*/);
  assert.match(middleware, /\/api\/admin\/:path\*/);
  assert.match(middleware, /verifyAdminSession/);
  assert.match(middleware, /\/admin\/login/);
});

test('admin settings use encrypted storage and redact secrets', () => {
  const store = source('lib/admin/settings-store.ts');
  const adminUi = source('app/admin/page.tsx');

  assert.match(store, /AES-GCM/);
  assert.match(store, /apiKeyConfigured/);
  assert.match(store, /passwordConfigured/);
  assert.doesNotMatch(adminUi, /process\.env/);
});

test('environment files are ignored while the example remains tracked', () => {
  const gitignore = source('.gitignore');

  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
});

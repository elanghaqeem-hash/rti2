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


test('extended AI providers are wired into settings and router', () => {
  const store = source('lib/admin/settings-store.ts');
  const router = source('lib/ai/provider-router.ts');
  const adminUi = source('app/admin/page.tsx');

  for (const provider of ['deepseek', 'mistral', 'xai']) {
    assert.match(store, new RegExp("'" + provider + "'"));
    assert.match(router, new RegExp("case '" + provider + "'"));
    assert.match(adminUi, new RegExp("'" + provider + "'"));
  }

  assert.match(router, /https:\/\/api\.deepseek\.com\/chat\/completions/);
  assert.match(router, /https:\/\/api\.mistral\.ai\/v1\/chat\/completions/);
  assert.match(router, /https:\/\/api\.x\.ai\/v1\/chat\/completions/);
});


test('admin provides simple AI type and API key setup menu', () => {
  const adminUi = source('app/admin/page.tsx');

  assert.match(adminUi, /Konfigurasi Cepat API AI/);
  assert.match(adminUi, /Jenis AI/);
  assert.match(adminUi, /API Key/);
  assert.match(adminUi, /Simpan & Aktifkan/);
  assert.match(adminUi, /selectedAiProvider/);
  assert.match(adminUi, /selectedAiApiKey/);
});

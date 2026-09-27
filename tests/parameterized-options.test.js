import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const roots = ['app', 'components'];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return /\.(tsx|jsx)$/.test(entry.name) ? [target] : [];
  });
}

test('selectable field values are parameterized instead of hard-coded in JSX', () => {
  const violations = [];

  for (const root of roots) {
    for (const file of walk(root)) {
      const source = fs.readFileSync(file, 'utf8');
      const literalOptions = source.match(/<option(?![^>]*value=["']["'])[^>]*>\s*[^<{\s][^<{]*<\/option>/g) || [];

      if (literalOptions.length > 0) {
        violations.push({
          file,
          options: literalOptions.map((value) => value.replace(/\s+/g, ' ').trim()),
        });
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Hard-coded field options found. Move them to lib/parameters/catalog.ts: ${JSON.stringify(violations)}`,
  );
});

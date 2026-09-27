import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const output = path.resolve(process.argv[2] || 'database/rti.sqlite.template');
const migrations = [
  '0001_leads.sql',
  '0002_system_parameters.sql',
];

fs.mkdirSync(path.dirname(output), { recursive: true });
if (fs.existsSync(output)) fs.unlinkSync(output);

const db = new DatabaseSync(output);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
`);

for (const name of migrations) {
  const sql = fs.readFileSync(path.resolve('migrations', name), 'utf8');
  db.exec('BEGIN IMMEDIATE;');
  try {
    db.exec(sql);
    db.prepare(
      'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
    ).run(name, new Date().toISOString());
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
db.close();
console.log(`Created production DB template: ${output}`);

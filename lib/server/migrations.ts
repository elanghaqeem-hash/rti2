import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, getDatabasePath } from '@/lib/server/database';

const MIGRATIONS = [
  '0001_leads.sql',
  '0002_system_parameters.sql',
  '0003_project_estimator_rfq.sql',
] as const;

export interface MigrationStatus {
  databasePath: string;
  connected: boolean;
  applied: string[];
  pending: string[];
  tables: {
    leads: boolean;
    systemParameters: boolean;
    projectEstimator: boolean;
    rfq: boolean;
    services: boolean;
  };
}

function migrationDirectory() {
  return path.join(process.cwd(), 'migrations');
}

function ensureMigrationLedger() {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

function tableExists(name: string) {
  const db = getDatabase();
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name) as { name?: string } | undefined;
  return row?.name === name;
}

export function getMigrationStatus(): MigrationStatus {
  const db = getDatabase();
  ensureMigrationLedger();

  const rows = db
    .prepare('SELECT name FROM schema_migrations ORDER BY name')
    .all() as Array<{ name: string }>;

  const applied = rows.map((row) => row.name);
  const pending = MIGRATIONS.filter((name) => !applied.includes(name));

  return {
    databasePath: getDatabasePath(),
    connected: true,
    applied,
    pending: [...pending],
    tables: {
      leads: tableExists('leads'),
      systemParameters: tableExists('system_parameters'),
      projectEstimator: tableExists('estimator_sessions') && tableExists('project_estimates'),
      rfq: tableExists('rfqs') && tableExists('rfq_versions'),
      services: tableExists('services') && tableExists('estimator_questions'),
    },
  };
}

export function applyPendingMigrations(): MigrationStatus {
  const db = getDatabase();
  ensureMigrationLedger();

  const applied = new Set(
    (db.prepare('SELECT name FROM schema_migrations').all() as Array<{ name: string }>)
      .map((row) => row.name),
  );

  for (const name of MIGRATIONS) {
    if (applied.has(name)) continue;

    const migrationPath = path.join(migrationDirectory(), name);
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${name}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

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

  return getMigrationStatus();
}

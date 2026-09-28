import { getRuntimeDatabase } from '@/lib/server/runtime-database';
import {
  RUNTIME_MIGRATION_NAMES,
  RUNTIME_MIGRATIONS,
  type RuntimeMigrationName,
} from '@/lib/server/runtime-migration-registry';

export interface RuntimeMigrationStatus {
  database: {
    connected: boolean;
    kind: 'cloudflare-d1' | 'node-sqlite';
    descriptor: string;
  };
  applied: string[];
  pending: string[];
  tables: {
    leads: boolean;
    systemParameters: boolean;
    enterpriseFinder: boolean;
    nistAssessments: boolean;
    nistQuestions: boolean;
    projectEstimator: boolean;
    rfq: boolean;
    estimatorServices: boolean;
    pdpAssessments: boolean;
    pdpQuestions: boolean;
    pdpEvidence: boolean;
  };
}

async function tableExists(
  database: Awaited<ReturnType<typeof getRuntimeDatabase>>,
  name: string,
) {
  const row = await database.queryOne<{ name?: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [name],
  );
  return row?.name === name;
}

async function ensureMigrationLedger(
  database: Awaited<ReturnType<typeof getRuntimeDatabase>>,
) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

export async function getRuntimeMigrationStatus(): Promise<RuntimeMigrationStatus> {
  const database = await getRuntimeDatabase();
  await ensureMigrationLedger(database);

  const rows = await database.queryAll<{ name: string }>(
    'SELECT name FROM schema_migrations ORDER BY name',
  );
  const applied = rows.map((row) => row.name);
  const pending = RUNTIME_MIGRATION_NAMES.filter(
    (name) => !applied.includes(name),
  );

  const [
    leads,
    systemParameters,
    finderQuestions,
    finderAssessments,
    finderServices,
    nistAssessments,
    nistQuestions,
    estimatorSessions,
    projectEstimates,
    rfqs,
    rfqVersions,
    services,
    estimatorQuestions,
    pdpAssessments,
    pdpQuestions,
    pdpEvidence,
  ] = await Promise.all([
    tableExists(database, 'leads'),
    tableExists(database, 'system_parameters'),
    tableExists(database, 'enterprise_finder_questions'),
    tableExists(database, 'enterprise_finder_assessments'),
    tableExists(database, 'enterprise_finder_services'),
    tableExists(database, 'nist_assessments'),
    tableExists(database, 'nist_questions'),
    tableExists(database, 'estimator_sessions'),
    tableExists(database, 'project_estimates'),
    tableExists(database, 'rfqs'),
    tableExists(database, 'rfq_versions'),
    tableExists(database, 'services'),
    tableExists(database, 'estimator_questions'),
    tableExists(database, 'pdp_assessments'),
    tableExists(database, 'pdp_questions'),
    tableExists(database, 'pdp_evidence_files'),
  ]);

  return {
    database: {
      connected: true,
      kind: database.kind,
      descriptor: database.descriptor,
    },
    applied,
    pending: [...pending],
    tables: {
      leads,
      systemParameters,
      enterpriseFinder:
        finderQuestions && finderAssessments && finderServices,
      nistAssessments,
      nistQuestions,
      projectEstimator: estimatorSessions && projectEstimates,
      rfq: rfqs && rfqVersions,
      estimatorServices: services && estimatorQuestions,
      pdpAssessments,
      pdpQuestions,
      pdpEvidence,
    },
  };
}

async function applyMigration(
  database: Awaited<ReturnType<typeof getRuntimeDatabase>>,
  name: RuntimeMigrationName,
) {
  const sql = RUNTIME_MIGRATIONS[name];
  await database.exec(sql);
  await database.run(
    `INSERT INTO schema_migrations (name, applied_at)
     VALUES (?, ?)
     ON CONFLICT(name) DO NOTHING`,
    [name, new Date().toISOString()],
  );
}

export async function applyRuntimePendingMigrations(): Promise<RuntimeMigrationStatus> {
  const database = await getRuntimeDatabase();
  await ensureMigrationLedger(database);

  const rows = await database.queryAll<{ name: string }>(
    'SELECT name FROM schema_migrations',
  );
  const applied = new Set(rows.map((row) => row.name));

  for (const name of RUNTIME_MIGRATION_NAMES) {
    if (applied.has(name)) continue;
    await applyMigration(database, name);
  }

  return getRuntimeMigrationStatus();
}

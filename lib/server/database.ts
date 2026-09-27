import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

let database: DatabaseSync | null = null;

export class DatabaseUnavailableError extends Error {
  constructor(message = 'RTI server database is not available.') {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

export function getDatabasePath(): string {
  const configured = String(process.env.RTI_DB_PATH || '').trim();

  if (configured) {
    return path.resolve(configured);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new DatabaseUnavailableError(
      'RTI_DB_PATH must be configured on the production server.',
    );
  }

  return path.join(process.cwd(), 'data', 'rti.sqlite');
}

export function getDatabase(): DatabaseSync {
  if (database) return database;

  try {
    const filePath = getDatabasePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    database = new DatabaseSync(filePath);
    database.exec('PRAGMA foreign_keys = ON;');
    database.exec('PRAGMA journal_mode = WAL;');
    database.exec('PRAGMA busy_timeout = 5000;');

    return database;
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) throw error;
    throw new DatabaseUnavailableError(
      error instanceof Error ? error.message : 'Unable to open RTI server database.',
    );
  }
}

export function closeDatabase() {
  if (!database) return;
  database.close();
  database = null;
}

export function checkDatabaseConnection(): boolean {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT 1 AS ok').get() as { ok?: number } | undefined;
    return row?.ok === 1;
  } catch {
    return false;
  }
}

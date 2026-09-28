/**
 * Cross-runtime database adapter for RTI.
 *
 * Cloudflare Workers: uses a D1 binding named RTI_DB.
 * Standard Node runtime: falls back to the existing persistent SQLite database.
 *
 * The OpenNext Cloudflare worker stores its request context on the same global
 * symbol used by getCloudflareContext(). Reading the binding from that context
 * avoids importing Cloudflare-only packages into the standard Node build.
 */

export type SqlValue = string | number | bigint | null;

export interface RuntimeDatabase {
  readonly kind: 'cloudflare-d1' | 'node-sqlite';
  readonly descriptor: string;
  queryAll<T = Record<string, unknown>>(
    sql: string,
    params?: SqlValue[],
  ): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(
    sql: string,
    params?: SqlValue[],
  ): Promise<T | null>;
  run(
    sql: string,
    params?: SqlValue[],
  ): Promise<{ success: boolean; changes?: number; lastRowId?: number | bigint }>;
  exec(sql: string): Promise<void>;
  batch(
    statements: Array<{ sql: string; params?: SqlValue[] }>,
  ): Promise<void>;
}

type D1Result<T> = {
  success?: boolean;
  results?: T[];
  meta?: {
    changes?: number;
    last_row_id?: number;
  };
};

type D1PreparedStatementLike = {
  bind: (...values: SqlValue[]) => D1PreparedStatementLike;
  all: <T = Record<string, unknown>>() => Promise<D1Result<T>>;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<D1Result<Record<string, unknown>>>;
};

type D1DatabaseLike = {
  prepare: (sql: string) => D1PreparedStatementLike;
  batch: (
    statements: D1PreparedStatementLike[],
  ) => Promise<Array<D1Result<Record<string, unknown>>>>;
  exec: (sql: string) => Promise<unknown>;
};

type OpenNextCloudflareContext = {
  env?: Record<string, unknown>;
};

export class RuntimeDatabaseUnavailableError extends Error {
  constructor(message = 'RTI database is unavailable.') {
    super(message);
    this.name = 'RuntimeDatabaseUnavailableError';
  }
}

function getOpenNextCloudflareEnv(): Record<string, unknown> | null {
  try {
    const symbol = Symbol.for('__cloudflare-context__');
    const context = (
      globalThis as typeof globalThis & {
        [key: symbol]: OpenNextCloudflareContext | undefined;
      }
    )[symbol];

    if (context?.env) return context.env;
  } catch {
    // Standard Node runtimes do not expose the OpenNext request context.
  }

  return null;
}

function asD1Database(value: unknown): D1DatabaseLike | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<D1DatabaseLike>;
  if (
    typeof candidate.prepare !== 'function' ||
    typeof candidate.batch !== 'function' ||
    typeof candidate.exec !== 'function'
  ) {
    return null;
  }
  return candidate as D1DatabaseLike;
}

function isCloudflareRuntime() {
  const env = getOpenNextCloudflareEnv();
  if (env) return true;

  const navigatorUserAgent =
    typeof navigator !== 'undefined' && navigator.userAgent
      ? navigator.userAgent.toLowerCase()
      : '';

  return (
    navigatorUserAgent.includes('cloudflare') ||
    String(process.env.CF_PAGES || '') === '1' ||
    String(process.env.WORKERS_RUNTIME || '').toLowerCase() === 'cloudflare'
  );
}

function createD1Adapter(database: D1DatabaseLike): RuntimeDatabase {
  return {
    kind: 'cloudflare-d1',
    descriptor: 'Cloudflare D1 binding RTI_DB',

    async queryAll<T>(
      sql: string,
      params: SqlValue[] = [],
    ) {
      const statement = database.prepare(sql).bind(...params);
      const result = await statement.all<T>();
      if (result.success === false) {
        throw new RuntimeDatabaseUnavailableError('Cloudflare D1 query failed.');
      }
      return Array.isArray(result.results) ? result.results : [];
    },

    async queryOne<T>(
      sql: string,
      params: SqlValue[] = [],
    ) {
      return database.prepare(sql).bind(...params).first<T>();
    },

    async run(sql: string, params: SqlValue[] = []) {
      const result = await database.prepare(sql).bind(...params).run();
      if (result.success === false) {
        throw new RuntimeDatabaseUnavailableError('Cloudflare D1 statement failed.');
      }
      return {
        success: true,
        changes: result.meta?.changes,
        lastRowId: result.meta?.last_row_id,
      };
    },

    async exec(sql: string) {
      await database.exec(sql);
    },

    async batch(statements) {
      if (statements.length === 0) return;
      const prepared = statements.map(({ sql, params = [] }) =>
        database.prepare(sql).bind(...params),
      );
      const results = await database.batch(prepared);
      if (results.some((result) => result?.success === false)) {
        throw new RuntimeDatabaseUnavailableError('Cloudflare D1 batch failed.');
      }
    },
  };
}

async function createNodeSqliteAdapter(): Promise<RuntimeDatabase> {
  const { getDatabase, getDatabasePath } = await import('@/lib/server/database');
  const database = getDatabase();

  return {
    kind: 'node-sqlite',
    descriptor: getDatabasePath(),

    async queryAll<T>(
      sql: string,
      params: SqlValue[] = [],
    ) {
      return database.prepare(sql).all(...params) as T[];
    },

    async queryOne<T>(
      sql: string,
      params: SqlValue[] = [],
    ) {
      return (database.prepare(sql).get(...params) as T | undefined) || null;
    },

    async run(sql: string, params: SqlValue[] = []) {
      const result = database.prepare(sql).run(...params);
      return {
        success: true,
        changes: Number(result.changes || 0),
        lastRowId: result.lastInsertRowid,
      };
    },

    async exec(sql: string) {
      database.exec(sql);
    },

    async batch(statements) {
      if (statements.length === 0) return;
      database.exec('BEGIN IMMEDIATE;');
      try {
        for (const statement of statements) {
          database.prepare(statement.sql).run(...(statement.params || []));
        }
        database.exec('COMMIT;');
      } catch (error) {
        database.exec('ROLLBACK;');
        throw error;
      }
    },
  };
}

export async function getRuntimeDatabase(): Promise<RuntimeDatabase> {
  const cloudflareEnv = getOpenNextCloudflareEnv();
  const d1 = asD1Database(cloudflareEnv?.RTI_DB);

  if (d1) return createD1Adapter(d1);

  if (cloudflareEnv || isCloudflareRuntime()) {
    throw new RuntimeDatabaseUnavailableError(
      'Cloudflare D1 binding RTI_DB is not configured for this Worker.',
    );
  }

  try {
    return await createNodeSqliteAdapter();
  } catch (error) {
    throw new RuntimeDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Unable to open RTI database.',
    );
  }
}

export async function getRuntimeDatabaseHealth() {
  try {
    const database = await getRuntimeDatabase();
    const row = await database.queryOne<{ ok?: number }>('SELECT 1 AS ok');
    return {
      connected: Number(row?.ok || 0) === 1,
      kind: database.kind,
      descriptor: database.descriptor,
    };
  } catch (error) {
    return {
      connected: false,
      kind: isCloudflareRuntime() ? 'cloudflare-d1' : 'node-sqlite',
      descriptor:
        error instanceof Error ? error.message : 'RTI database is unavailable.',
    } as const;
  }
}

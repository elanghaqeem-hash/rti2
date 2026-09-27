import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  getDefaultParameterOptions,
  type ParameterOption,
} from '@/lib/parameters/catalog';

type D1Result<T = unknown> = {
  success?: boolean;
  results?: T[];
};

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  all: <T = unknown>() => Promise<D1Result<T>>;
  run: () => Promise<D1Result>;
};

type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatement;
};

type ParameterRow = {
  group_key: string;
  value: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: number;
  is_system: number;
};

export class ParameterDatabaseUnavailableError extends Error {
  constructor(message = 'Cloudflare D1 binding RTI_DB is not available.') {
    super(message);
    this.name = 'ParameterDatabaseUnavailableError';
  }
}

function getDatabase(): D1DatabaseLike {
  try {
    const context = getCloudflareContext();
    const env = context.env as Record<string, unknown>;
    const database = env.RTI_DB as D1DatabaseLike | undefined;
    if (!database || typeof database.prepare !== 'function') {
      throw new ParameterDatabaseUnavailableError();
    }
    return database;
  } catch (error) {
    if (error instanceof ParameterDatabaseUnavailableError) throw error;
    throw new ParameterDatabaseUnavailableError();
  }
}

function rowToOption(row: ParameterRow): ParameterOption {
  return {
    group: row.group_key,
    value: row.value,
    label: row.label,
    description: row.description || undefined,
    sortOrder: Number(row.sort_order),
    active: Number(row.is_active) === 1,
    system: Number(row.is_system) === 1,
  };
}

export async function listParameterOverrides(
  groupKeys: string[],
): Promise<ParameterOption[]> {
  if (groupKeys.length === 0) return [];
  const database = getDatabase();
  const placeholders = groupKeys.map(() => '?').join(',');
  const result = await database
    .prepare(
      `SELECT group_key, value, label, description, sort_order, is_active, is_system
       FROM system_parameters
       WHERE group_key IN (${placeholders})
       ORDER BY group_key, sort_order, label`,
    )
    .bind(...groupKeys)
    .all<ParameterRow>();

  if (result.success === false || !Array.isArray(result.results)) {
    throw new Error('D1 parameter query failed.');
  }

  return result.results.map(rowToOption);
}

export async function resolveParameterGroups(
  groupKeys: string[],
): Promise<Record<string, ParameterOption[]>> {
  const result: Record<string, ParameterOption[]> = {};
  const defaults = Object.fromEntries(
    groupKeys.map((key) => [key, getDefaultParameterOptions(key)]),
  ) as Record<string, ParameterOption[]>;

  let overrides: ParameterOption[] = [];
  try {
    overrides = await listParameterOverrides(groupKeys);
  } catch (error) {
    if (!(error instanceof ParameterDatabaseUnavailableError)) throw error;
  }

  for (const groupKey of groupKeys) {
    const merged = new Map<string, ParameterOption>();
    for (const item of defaults[groupKey] || []) merged.set(item.value, item);
    for (const item of overrides.filter((row) => row.group === groupKey)) {
      const base = merged.get(item.value);
      merged.set(item.value, {
        ...(base || item),
        ...item,
        system: base?.system ?? item.system,
      });
    }

    result[groupKey] = [...merged.values()]
      .filter((item) => item.active)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }

  return result;
}

export async function upsertParameterOption(
  option: ParameterOption,
): Promise<void> {
  const database = getDatabase();
  const now = new Date().toISOString();

  const result = await database
    .prepare(
      `INSERT INTO system_parameters (
        group_key, value, label, description, sort_order, is_active, is_system, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(group_key, value) DO UPDATE SET
        label = excluded.label,
        description = excluded.description,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active,
        is_system = excluded.is_system,
        updated_at = excluded.updated_at`,
    )
    .bind(
      option.group,
      option.value,
      option.label,
      option.description || null,
      option.sortOrder,
      option.active ? 1 : 0,
      option.system ? 1 : 0,
      now,
    )
    .run();

  if (result.success === false) throw new Error('D1 parameter upsert failed.');
}

export async function deactivateParameterOption(
  groupKey: string,
  value: string,
): Promise<void> {
  const defaults = getDefaultParameterOptions(groupKey);
  const defaultItem = defaults.find((item) => item.value === value);

  if (defaultItem) {
    await upsertParameterOption({ ...defaultItem, active: false });
    return;
  }

  const database = getDatabase();
  const result = await database
    .prepare(
      'DELETE FROM system_parameters WHERE group_key = ? AND value = ?',
    )
    .bind(groupKey, value)
    .run();

  if (result.success === false) throw new Error('D1 parameter delete failed.');
}

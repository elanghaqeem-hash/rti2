import {
  getDefaultParameterOptions,
  type ParameterOption,
} from '@/lib/parameters/catalog';
import {
  DatabaseUnavailableError,
  getDatabase,
} from '@/lib/server/database';

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
  constructor(message = 'RTI server database is not available or not initialized.') {
    super(message);
    this.name = 'ParameterDatabaseUnavailableError';
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

function parameterDatabase() {
  try {
    return getDatabase();
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      throw new ParameterDatabaseUnavailableError(error.message);
    }
    throw error;
  }
}

export async function listParameterOverrides(
  groupKeys: string[],
): Promise<ParameterOption[]> {
  if (groupKeys.length === 0) return [];

  try {
    const database = parameterDatabase();
    const placeholders = groupKeys.map(() => '?').join(',');
    const rows = database
      .prepare(
        `SELECT group_key, value, label, description, sort_order, is_active, is_system
         FROM system_parameters
         WHERE group_key IN (${placeholders})
         ORDER BY group_key, sort_order, label`,
      )
      .all(...groupKeys) as ParameterRow[];

    return rows.map(rowToOption);
  } catch (error) {
    if (error instanceof ParameterDatabaseUnavailableError) throw error;
    throw new ParameterDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Parameter database query failed.',
    );
  }
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
  try {
    const database = parameterDatabase();
    const now = new Date().toISOString();

    database
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
      .run(
        option.group,
        option.value,
        option.label,
        option.description || null,
        option.sortOrder,
        option.active ? 1 : 0,
        option.system ? 1 : 0,
        now,
      );
  } catch (error) {
    if (error instanceof ParameterDatabaseUnavailableError) throw error;
    throw new ParameterDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Parameter database update failed.',
    );
  }
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

  try {
    const database = parameterDatabase();
    database
      .prepare('DELETE FROM system_parameters WHERE group_key = ? AND value = ?')
      .run(groupKey, value);
  } catch (error) {
    if (error instanceof ParameterDatabaseUnavailableError) throw error;
    throw new ParameterDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Parameter database delete failed.',
    );
  }
}

import { randomUUID } from 'node:crypto';
import {
  getRuntimeDatabase,
  RuntimeDatabaseUnavailableError,
  type RuntimeDatabase,
  type SqlValue,
} from '@/lib/server/runtime-database';

export class FinderAdminRuntimeDatabaseUnavailableError extends Error {
  constructor(message = 'Enterprise Solution Finder admin database is unavailable.') {
    super(message);
    this.name = 'FinderAdminRuntimeDatabaseUnavailableError';
  }
}

async function db() {
  try {
    return await getRuntimeDatabase();
  } catch (error) {
    if (error instanceof RuntimeDatabaseUnavailableError) {
      throw new FinderAdminRuntimeDatabaseUnavailableError(error.message);
    }
    throw error;
  }
}

async function row(
  database: RuntimeDatabase,
  table: string,
  where: string,
  values: SqlValue[],
) {
  const allowed = new Set([
    'enterprise_finder_questions',
    'enterprise_finder_question_options',
    'enterprise_finder_services',
    'enterprise_finder_service_mappings',
    'enterprise_finder_scoring_weights',
    'enterprise_finder_ai_prompts',
  ]);
  if (!allowed.has(table)) throw new Error('invalid-table');
  return database.queryOne(
    `SELECT * FROM ${table} WHERE ${where}`,
    values,
  );
}

async function audit(
  database: RuntimeDatabase,
  params: {
    actor: string;
    action: string;
    entityType: string;
    entityKey?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
  },
) {
  await database.run(
    `INSERT INTO audit_logs (
      id, actor, action, entity_type, entity_key,
      old_value_json, new_value_json, ip_address, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      params.actor.slice(0, 160),
      params.action.slice(0, 100),
      params.entityType.slice(0, 100),
      params.entityKey?.slice(0, 240) || null,
      params.oldValue === undefined ? null : JSON.stringify(params.oldValue),
      params.newValue === undefined ? null : JSON.stringify(params.newValue),
      params.ipAddress?.slice(0, 100) || null,
      new Date().toISOString(),
    ],
  );
}

export async function getFinderAdminConfigRuntime() {
  try {
    const database = await db();
    const [
      questions,
      options,
      services,
      mappings,
      weights,
      aiPrompts,
      auditLogs,
    ] = await Promise.all([
      database.queryAll(
        `SELECT *
         FROM enterprise_finder_questions
         ORDER BY step, sort_order, question_key`,
      ),
      database.queryAll(
        `SELECT *
         FROM enterprise_finder_question_options
         ORDER BY question_key, sort_order, value`,
      ),
      database.queryAll(
        `SELECT *
         FROM enterprise_finder_services
         ORDER BY category, priority_weight DESC, service_key`,
      ),
      database.queryAll(
        `SELECT *
         FROM enterprise_finder_service_mappings
         ORDER BY service_key, dimension_type, dimension_value`,
      ),
      database.queryAll(
        `SELECT *
         FROM enterprise_finder_scoring_weights
         ORDER BY weight_key`,
      ),
      database.queryAll(
        `SELECT *
         FROM enterprise_finder_ai_prompts
         ORDER BY prompt_key, version DESC`,
      ),
      database.queryAll(
        `SELECT id, actor, action, entity_type, entity_key, ip_address, created_at
         FROM audit_logs
         ORDER BY created_at DESC
         LIMIT 100`,
      ),
    ]);

    return {
      questions,
      options,
      services,
      mappings,
      weights,
      aiPrompts,
      auditLogs,
    };
  } catch (error) {
    if (error instanceof FinderAdminRuntimeDatabaseUnavailableError) throw error;
    throw new FinderAdminRuntimeDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Admin configuration query failed.',
    );
  }
}

function safeKey(value: unknown, max = 120) {
  const key = String(value || '').trim();
  if (!key || key.length > max || !/^[a-zA-Z0-9_.:-]+$/.test(key)) {
    throw new Error('invalid-key');
  }
  return key;
}

function safeText(value: unknown, max: number, required = false) {
  const result = typeof value === 'string' ? value.trim().slice(0, max) : '';
  if (required && !result) throw new Error('invalid-text');
  return result;
}

function safeBoolean(value: unknown, fallback = true) {
  return value === undefined ? fallback : value === true || value === 1;
}

function safeNumber(value: unknown, min: number, max: number, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export async function upsertFinderAdminEntityRuntime(params: {
  entityType: 'question' | 'option' | 'service' | 'mapping' | 'weight' | 'prompt';
  payload: Record<string, unknown>;
  actor: string;
  ipAddress?: string;
}) {
  const database = await db();
  const now = new Date().toISOString();
  const { entityType, payload } = params;

  let entityKey = '';
  let oldValue: unknown;
  let newValue: unknown;

  if (entityType === 'question') {
    const questionKey = safeKey(payload.question_key);
    entityKey = questionKey;
    oldValue = await row(
      database,
      'enterprise_finder_questions',
      'question_key = ?',
      [questionKey],
    );

    const step = Math.trunc(safeNumber(payload.step, 1, 4, 1));
    const category = safeText(payload.category, 80, true);
    const questionType = safeText(payload.question_type, 30, true);
    if (!['single', 'multi', 'number', 'text', 'slider', 'matrix'].includes(questionType)) {
      throw new Error('invalid-question-type');
    }

    const conditionJson = safeText(payload.condition_json, 4000) || null;
    if (conditionJson) JSON.parse(conditionJson);

    await database.run(
      `INSERT INTO enterprise_finder_questions (
        question_key, step, category, question_type,
        label_id, label_en, description_id, description_en,
        required, condition_json, weight, sort_order, version, is_active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(question_key) DO UPDATE SET
        step = excluded.step,
        category = excluded.category,
        question_type = excluded.question_type,
        label_id = excluded.label_id,
        label_en = excluded.label_en,
        description_id = excluded.description_id,
        description_en = excluded.description_en,
        required = excluded.required,
        condition_json = excluded.condition_json,
        weight = excluded.weight,
        sort_order = excluded.sort_order,
        version = enterprise_finder_questions.version + 1,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at`,
      [
        questionKey,
        step,
        category,
        questionType,
        safeText(payload.label_id, 500, true),
        safeText(payload.label_en, 500, true),
        safeText(payload.description_id, 2000) || null,
        safeText(payload.description_en, 2000) || null,
        safeBoolean(payload.required, false) ? 1 : 0,
        conditionJson,
        safeNumber(payload.weight, 0, 20, 1),
        Math.trunc(safeNumber(payload.sort_order, -10000, 10000, 0)),
        safeBoolean(payload.is_active, true) ? 1 : 0,
        now,
      ],
    );

    newValue = await row(
      database,
      'enterprise_finder_questions',
      'question_key = ?',
      [questionKey],
    );
  } else if (entityType === 'option') {
    const questionKey = safeKey(payload.question_key);
    const value = safeKey(payload.value, 160);
    entityKey = `${questionKey}::${value}`;
    oldValue = await row(
      database,
      'enterprise_finder_question_options',
      'question_key = ? AND value = ?',
      [questionKey, value],
    );

    const metadataJson = safeText(payload.metadata_json, 4000) || null;
    if (metadataJson) JSON.parse(metadataJson);

    await database.run(
      `INSERT INTO enterprise_finder_question_options (
        question_key, value, label_id, label_en,
        description_id, description_en, metadata_json,
        score, sort_order, is_active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(question_key, value) DO UPDATE SET
        label_id = excluded.label_id,
        label_en = excluded.label_en,
        description_id = excluded.description_id,
        description_en = excluded.description_en,
        metadata_json = excluded.metadata_json,
        score = excluded.score,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at`,
      [
        questionKey,
        value,
        safeText(payload.label_id, 500, true),
        safeText(payload.label_en, 500, true),
        safeText(payload.description_id, 2000) || null,
        safeText(payload.description_en, 2000) || null,
        metadataJson,
        safeNumber(payload.score, -100, 100, 0),
        Math.trunc(safeNumber(payload.sort_order, -10000, 10000, 0)),
        safeBoolean(payload.is_active, true) ? 1 : 0,
        now,
      ],
    );

    newValue = await row(
      database,
      'enterprise_finder_question_options',
      'question_key = ? AND value = ?',
      [questionKey, value],
    );
  } else if (entityType === 'service') {
    const serviceKey = safeKey(payload.service_key);
    entityKey = serviceKey;
    oldValue = await row(
      database,
      'enterprise_finder_services',
      'service_key = ?',
      [serviceKey],
    );

    const complexity = safeText(payload.complexity, 20, true);
    if (!['Low', 'Moderate', 'High', 'Enterprise'].includes(complexity)) {
      throw new Error('invalid-complexity');
    }

    const outcomesJson = safeText(payload.outcomes_json, 8000) || '[]';
    JSON.parse(outcomesJson);

    await database.run(
      `INSERT INTO enterprise_finder_services (
        service_key, category, name_id, name_en,
        description_id, description_en, url,
        delivery_model, typical_duration, complexity,
        priority_weight, diagnostic_tool_slug, outcomes_json,
        is_active, version, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(service_key) DO UPDATE SET
        category = excluded.category,
        name_id = excluded.name_id,
        name_en = excluded.name_en,
        description_id = excluded.description_id,
        description_en = excluded.description_en,
        url = excluded.url,
        delivery_model = excluded.delivery_model,
        typical_duration = excluded.typical_duration,
        complexity = excluded.complexity,
        priority_weight = excluded.priority_weight,
        diagnostic_tool_slug = excluded.diagnostic_tool_slug,
        outcomes_json = excluded.outcomes_json,
        is_active = excluded.is_active,
        version = enterprise_finder_services.version + 1,
        updated_at = excluded.updated_at`,
      [
        serviceKey,
        safeText(payload.category, 100, true),
        safeText(payload.name_id, 500, true),
        safeText(payload.name_en, 500, true),
        safeText(payload.description_id, 3000, true),
        safeText(payload.description_en, 3000, true),
        safeText(payload.url, 500, true),
        safeText(payload.delivery_model, 100, true),
        safeText(payload.typical_duration, 100, true),
        complexity,
        safeNumber(payload.priority_weight, 0, 100, 10),
        safeText(payload.diagnostic_tool_slug, 160) || null,
        outcomesJson,
        safeBoolean(payload.is_active, true) ? 1 : 0,
        now,
      ],
    );

    newValue = await row(
      database,
      'enterprise_finder_services',
      'service_key = ?',
      [serviceKey],
    );
  } else if (entityType === 'mapping') {
    const id = Math.trunc(
      safeNumber(payload.id, 0, Number.MAX_SAFE_INTEGER, 0),
    );
    const serviceKey = safeKey(payload.service_key);
    const dimensionType = safeText(payload.dimension_type, 30, true);
    const dimensionValue = safeKey(payload.dimension_value, 160);

    if (
      ![
        'industry',
        'scale',
        'pressure',
        'capability',
        'objective',
        'timeline',
        'delivery',
        'regulated',
      ].includes(dimensionType)
    ) {
      throw new Error('invalid-dimension');
    }

    if (id > 0) {
      entityKey = String(id);
      oldValue = await row(
        database,
        'enterprise_finder_service_mappings',
        'id = ?',
        [id],
      );

      await database.run(
        `UPDATE enterprise_finder_service_mappings SET
          service_key = ?,
          dimension_type = ?,
          dimension_value = ?,
          weight = ?,
          rationale_id = ?,
          rationale_en = ?,
          is_active = ?,
          version = version + 1,
          updated_at = ?
        WHERE id = ?`,
        [
          serviceKey,
          dimensionType,
          dimensionValue,
          safeNumber(payload.weight, -100, 100, 0),
          safeText(payload.rationale_id, 2000) || null,
          safeText(payload.rationale_en, 2000) || null,
          safeBoolean(payload.is_active, true) ? 1 : 0,
          now,
          id,
        ],
      );

      newValue = await row(
        database,
        'enterprise_finder_service_mappings',
        'id = ?',
        [id],
      );
    } else {
      const inserted = await database.run(
        `INSERT INTO enterprise_finder_service_mappings (
          service_key, dimension_type, dimension_value, weight,
          rationale_id, rationale_en, is_active, version, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          serviceKey,
          dimensionType,
          dimensionValue,
          safeNumber(payload.weight, -100, 100, 0),
          safeText(payload.rationale_id, 2000) || null,
          safeText(payload.rationale_en, 2000) || null,
          safeBoolean(payload.is_active, true) ? 1 : 0,
          now,
        ],
      );
      const createdId = Number(inserted.lastRowId || 0);
      if (!createdId) throw new Error('mapping-insert-failed');
      entityKey = String(createdId);
      newValue = await row(
        database,
        'enterprise_finder_service_mappings',
        'id = ?',
        [createdId],
      );
    }
  } else if (entityType === 'weight') {
    const weightKey = safeKey(payload.weight_key, 160);
    entityKey = weightKey;
    oldValue = await row(
      database,
      'enterprise_finder_scoring_weights',
      'weight_key = ?',
      [weightKey],
    );

    await database.run(
      `INSERT INTO enterprise_finder_scoring_weights (
        weight_key, weight_value, description, version, is_active, updated_at
      ) VALUES (?, ?, ?, 1, ?, ?)
      ON CONFLICT(weight_key) DO UPDATE SET
        weight_value = excluded.weight_value,
        description = excluded.description,
        version = enterprise_finder_scoring_weights.version + 1,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at`,
      [
        weightKey,
        safeNumber(payload.weight_value, -10, 10, 0),
        safeText(payload.description, 1000) || null,
        safeBoolean(payload.is_active, true) ? 1 : 0,
        now,
      ],
    );

    newValue = await row(
      database,
      'enterprise_finder_scoring_weights',
      'weight_key = ?',
      [weightKey],
    );
  } else {
    const promptKey = safeKey(payload.prompt_key, 160);
    entityKey = promptKey;
    oldValue = await row(
      database,
      'enterprise_finder_ai_prompts',
      'prompt_key = ?',
      [promptKey],
    );

    await database.run(
      `INSERT INTO enterprise_finder_ai_prompts (
        prompt_key, prompt_text, version, is_active, updated_at
      ) VALUES (?, ?, 1, ?, ?)
      ON CONFLICT(prompt_key) DO UPDATE SET
        prompt_text = excluded.prompt_text,
        version = enterprise_finder_ai_prompts.version + 1,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at`,
      [
        promptKey,
        safeText(payload.prompt_text, 20_000, true),
        safeBoolean(payload.is_active, true) ? 1 : 0,
        now,
      ],
    );

    newValue = await row(
      database,
      'enterprise_finder_ai_prompts',
      'prompt_key = ?',
      [promptKey],
    );
  }

  await audit(database, {
    actor: params.actor,
    action: oldValue ? 'update' : 'create',
    entityType,
    entityKey,
    oldValue,
    newValue,
    ipAddress: params.ipAddress,
  });

  return { entityType, entityKey, record: newValue };
}

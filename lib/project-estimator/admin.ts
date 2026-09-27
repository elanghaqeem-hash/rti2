import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/server/database';

export type EstimatorAdminDashboard = {
  metrics: {
    sessions: number;
    completedEstimates: number;
    rfqs: number;
    submittedRfqs: number;
    opportunities: number;
    pipelineMin: number;
    pipelineMax: number;
  };
  rfqs: Array<{
    id: string;
    rfqNumber: string;
    projectName: string;
    company: string;
    service: string;
    complexityLevel: string;
    projectSize: string;
    priceMin: number;
    priceMax: number;
    readinessScore: number;
    status: string;
    stage: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  categories: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    sortOrder: number;
    active: boolean;
  }>;
  services: Array<{
    id: string;
    categoryId: string;
    categoryName: string;
    slug: string;
    name: string;
    description: string;
    baseEffortDays: number;
    basePriceMin: number;
    basePriceMax: number;
    durationMinWeeks: number;
    durationMaxWeeks: number;
    active: boolean;
  }>;
  pricing: Array<{
    key: string;
    label: string;
    value: number;
    minValue: number | null;
    maxValue: number | null;
  }>;
  settings: Array<{
    key: string;
    label: string;
    value: string;
    public: boolean;
  }>;
  questions: Array<{
    id: string;
    serviceId: string | null;
    serviceName: string;
    key: string;
    label: string;
    helpText: string;
    fieldType: string;
    required: boolean;
    dimension: string | null;
    weight: number;
    quickMode: boolean;
    detailedMode: boolean;
    active: boolean;
    sortOrder: number;
  }>;
  questionOptions: Array<{
    id: string;
    questionId: string;
    value: string;
    label: string;
    score: number;
    effortMultiplier: number;
    priceMultiplier: number;
    sortOrder: number;
    active: boolean;
  }>;
  rules: Array<{
    id: string;
    serviceId: string | null;
    serviceName: string;
    name: string;
    conditionsJson: string;
    effectsJson: string;
    sortOrder: number;
    active: boolean;
  }>;
  resources: Array<{
    id: string;
    roleKey: string;
    name: string;
    internalDayRate: number | null;
    active: boolean;
  }>;
  serviceResources: Array<{
    serviceId: string;
    serviceName: string;
    resourceRoleId: string;
    resourceName: string;
    quantity: number;
    effortShare: number;
  }>;
};

const FIELD_TYPES = new Set([
  'text',
  'number',
  'currency',
  'date',
  'dropdown',
  'multiselect',
  'radio',
  'checkbox',
  'slider',
  'file',
  'textarea',
]);

function scalar(sql: string): number {
  const row = getDatabase().prepare(sql).get() as { value?: number } | undefined;
  return Number(row?.value || 0);
}

function audit(entityType: string, entityId: string, action: string, actor: string, before: unknown, after: unknown) {
  getDatabase().prepare(
    `INSERT INTO estimator_audit_logs
     (id, entity_type, entity_id, action, actor, before_json, after_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    entityType,
    entityId,
    action,
    actor,
    before == null ? null : JSON.stringify(before),
    after == null ? null : JSON.stringify(after),
    new Date().toISOString(),
  );
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export function getEstimatorAdminDashboard(): EstimatorAdminDashboard {
  const db = getDatabase();
  const rfqs = db.prepare(
    `SELECT r.id, r.rfq_number, es.project_name, o.name AS company, s.name AS service,
            pe.complexity_level, pe.project_size, pe.price_min, pe.price_max,
            pe.readiness_score, r.status, op.stage, r.created_at, r.updated_at
     FROM rfqs r
     JOIN estimator_sessions es ON es.id = r.session_id
     JOIN organizations o ON o.id = es.organization_id
     JOIN project_estimates pe ON pe.id = r.estimate_id
     JOIN services s ON s.id = pe.service_id
     LEFT JOIN opportunities op ON op.rfq_id = r.id
     ORDER BY r.updated_at DESC
     LIMIT 500`,
  ).all() as any[];

  const categories = db.prepare(
    `SELECT id, slug, name, description, sort_order, is_active
     FROM service_categories ORDER BY sort_order, name`,
  ).all() as any[];

  const services = db.prepare(
    `SELECT s.id, s.category_id, c.name AS category_name, s.slug, s.name, s.description,
            s.base_effort_days, s.base_price_min, s.base_price_max,
            s.default_duration_min_weeks, s.default_duration_max_weeks, s.is_active
     FROM services s
     JOIN service_categories c ON c.id=s.category_id
     ORDER BY c.sort_order, s.name`,
  ).all() as any[];

  const pricing = db.prepare(
    `SELECT key, label, value, min_value, max_value
     FROM pricing_parameters ORDER BY key`,
  ).all() as any[];

  const settings = db.prepare(
    `SELECT key, label, value, is_public FROM estimator_settings ORDER BY key`,
  ).all() as any[];

  const questions = db.prepare(
    `SELECT q.id, q.service_id, COALESCE(s.name, 'Common / all services') AS service_name,
            q.question_key, q.label, q.help_text, q.field_type, q.required, q.complexity_dimension,
            q.weight, q.quick_mode, q.detailed_mode, q.is_active, q.sort_order
     FROM estimator_questions q
     LEFT JOIN services s ON s.id=q.service_id
     ORDER BY COALESCE(s.name, ''), q.sort_order, q.label`,
  ).all() as any[];

  const questionOptions = db.prepare(
    `SELECT id, question_id, value, label, score, effort_multiplier, price_multiplier,
            sort_order, is_active
     FROM estimator_question_options
     ORDER BY question_id, sort_order, label`,
  ).all() as any[];

  const rules = db.prepare(
    `SELECT r.id, r.service_id, COALESCE(s.name, 'Common / all services') AS service_name,
            r.name, r.condition_json, r.effects_json, r.sort_order, r.is_active
     FROM estimator_rules r
     LEFT JOIN services s ON s.id=r.service_id
     ORDER BY r.sort_order, r.name`,
  ).all() as any[];

  const resources = db.prepare(
    `SELECT id, role_key, name, internal_day_rate, is_active
     FROM resource_roles ORDER BY name`,
  ).all() as any[];

  const serviceResources = db.prepare(
    `SELECT sr.service_id, s.name AS service_name, sr.resource_role_id,
            rr.name AS resource_name, sr.quantity, sr.effort_share
     FROM service_resource_defaults sr
     JOIN services s ON s.id=sr.service_id
     JOIN resource_roles rr ON rr.id=sr.resource_role_id
     ORDER BY s.name, rr.name`,
  ).all() as any[];

  return {
    metrics: {
      sessions: scalar('SELECT COUNT(*) AS value FROM estimator_sessions'),
      completedEstimates: scalar('SELECT COUNT(*) AS value FROM project_estimates'),
      rfqs: scalar('SELECT COUNT(*) AS value FROM rfqs'),
      submittedRfqs: scalar("SELECT COUNT(*) AS value FROM rfqs WHERE status <> 'draft'"),
      opportunities: scalar('SELECT COUNT(*) AS value FROM opportunities'),
      pipelineMin: scalar('SELECT COALESCE(SUM(estimated_value_min),0) AS value FROM opportunities'),
      pipelineMax: scalar('SELECT COALESCE(SUM(estimated_value_max),0) AS value FROM opportunities'),
    },
    rfqs: rfqs.map((row) => ({
      id: row.id,
      rfqNumber: row.rfq_number,
      projectName: row.project_name,
      company: row.company,
      service: row.service,
      complexityLevel: row.complexity_level,
      projectSize: row.project_size,
      priceMin: Number(row.price_min),
      priceMax: Number(row.price_max),
      readinessScore: Number(row.readiness_score),
      status: row.status,
      stage: row.stage || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    categories: categories.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description || '',
      sortOrder: Number(row.sort_order),
      active: Number(row.is_active) === 1,
    })),
    services: services.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      slug: row.slug,
      name: row.name,
      description: row.description || '',
      baseEffortDays: Number(row.base_effort_days),
      basePriceMin: Number(row.base_price_min),
      basePriceMax: Number(row.base_price_max),
      durationMinWeeks: Number(row.default_duration_min_weeks),
      durationMaxWeeks: Number(row.default_duration_max_weeks),
      active: Number(row.is_active) === 1,
    })),
    pricing: pricing.map((row) => ({
      key: row.key,
      label: row.label,
      value: Number(row.value),
      minValue: row.min_value == null ? null : Number(row.min_value),
      maxValue: row.max_value == null ? null : Number(row.max_value),
    })),
    settings: settings.map((row) => ({
      key: row.key,
      label: row.label,
      value: String(row.value || ''),
      public: Number(row.is_public) === 1,
    })),
    questions: questions.map((row) => ({
      id: row.id,
      serviceId: row.service_id || null,
      serviceName: row.service_name,
      key: row.question_key,
      label: row.label,
      helpText: row.help_text || '',
      fieldType: row.field_type,
      required: Number(row.required) === 1,
      dimension: row.complexity_dimension || null,
      weight: Number(row.weight),
      quickMode: Number(row.quick_mode) === 1,
      detailedMode: Number(row.detailed_mode) === 1,
      active: Number(row.is_active) === 1,
      sortOrder: Number(row.sort_order),
    })),
    questionOptions: questionOptions.map((row) => ({
      id: row.id,
      questionId: row.question_id,
      value: row.value,
      label: row.label,
      score: Number(row.score),
      effortMultiplier: Number(row.effort_multiplier),
      priceMultiplier: Number(row.price_multiplier),
      sortOrder: Number(row.sort_order),
      active: Number(row.is_active) === 1,
    })),
    rules: rules.map((row) => ({
      id: row.id,
      serviceId: row.service_id || null,
      serviceName: row.service_name,
      name: row.name,
      conditionsJson: row.condition_json,
      effectsJson: row.effects_json,
      sortOrder: Number(row.sort_order),
      active: Number(row.is_active) === 1,
    })),
    resources: resources.map((row) => ({
      id: row.id,
      roleKey: row.role_key,
      name: row.name,
      internalDayRate: row.internal_day_rate == null ? null : Number(row.internal_day_rate),
      active: Number(row.is_active) === 1,
    })),
    serviceResources: serviceResources.map((row) => ({
      serviceId: row.service_id,
      serviceName: row.service_name,
      resourceRoleId: row.resource_role_id,
      resourceName: row.resource_name,
      quantity: Number(row.quantity),
      effortShare: Number(row.effort_share),
    })),
  };
}

export function updateOpportunityStage(params: {
  rfqId: string;
  stage: string;
  actor: string;
  note?: string;
}) {
  const allowed = new Set([
    'New RFQ',
    'Initial Review',
    'Qualification',
    'Clarification',
    'Proposal Preparation',
    'Proposal Sent',
    'Negotiation',
    'Won',
    'Lost',
  ]);
  if (!allowed.has(params.stage)) throw new Error('Invalid opportunity stage.');
  const db = getDatabase();
  const before = db.prepare('SELECT id, stage FROM opportunities WHERE rfq_id=?').get(params.rfqId) as
    | { id: string; stage: string }
    | undefined;
  if (!before) throw new Error('Opportunity not found.');

  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare('UPDATE opportunities SET stage=?, updated_at=? WHERE rfq_id=?').run(params.stage, now, params.rfqId);
    db.prepare(
      `INSERT INTO lead_activities (id, opportunity_id, activity_type, note, actor, created_at)
       VALUES (?, ?, 'STAGE_CHANGE', ?, ?, ?)`,
    ).run(randomUUID(), before.id, params.note || `${before.stage} → ${params.stage}`, params.actor, now);
    if (params.stage === 'Won' || params.stage === 'Lost') {
      db.prepare("UPDATE rfqs SET status='closed', updated_at=? WHERE id=?").run(now, params.rfqId);
    }
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
  audit('opportunity', before.id, 'stage_change', params.actor, before, { stage: params.stage });
}

export function upsertServiceCategory(params: {
  id?: string;
  slug?: string;
  name: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
  actor: string;
}) {
  const db = getDatabase();
  const id = params.id || `cat-${randomUUID()}`;
  const name = params.name.trim().slice(0, 180);
  const slug = slugify(params.slug || name);
  if (!name || !slug) throw new Error('Category name and slug are required.');
  const before = db.prepare('SELECT * FROM service_categories WHERE id=?').get(id);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO service_categories
      (id, slug, name, description, sort_order, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       slug=excluded.slug, name=excluded.name, description=excluded.description,
       sort_order=excluded.sort_order, is_active=excluded.is_active, updated_at=excluded.updated_at`,
  ).run(
    id,
    slug,
    name,
    params.description?.trim().slice(0, 2000) || null,
    Math.trunc(params.sortOrder ?? 100),
    params.active === false ? 0 : 1,
    now,
    now,
  );
  audit('service_category', id, before ? 'update' : 'create', params.actor, before, params);
  return id;
}

export function createEstimatorService(params: {
  categoryId: string;
  slug?: string;
  name: string;
  description?: string;
  baseEffortDays?: number;
  basePriceMin?: number;
  basePriceMax?: number;
  durationMinWeeks?: number;
  durationMaxWeeks?: number;
  actor: string;
}) {
  const db = getDatabase();
  const category = db.prepare('SELECT id FROM service_categories WHERE id=? AND is_active=1').get(params.categoryId);
  if (!category) throw new Error('Active service category is required.');
  const id = `svc-${randomUUID()}`;
  const name = params.name.trim().slice(0, 180);
  const slug = slugify(params.slug || name);
  if (!name || !slug) throw new Error('Service name and slug are required.');
  const minPrice = Math.max(0, Math.trunc(params.basePriceMin || 0));
  const maxPrice = Math.max(minPrice, Math.trunc(params.basePriceMax || minPrice));
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO services
      (id, category_id, slug, name, description, base_effort_days, base_price_min,
       base_price_max, billing_unit, default_duration_min_weeks,
       default_duration_max_weeks, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'project', ?, ?, 1, ?, ?)`,
  ).run(
    id,
    params.categoryId,
    slug,
    name,
    params.description?.trim().slice(0, 2000) || null,
    Math.max(0.5, Number(params.baseEffortDays || 5)),
    minPrice,
    maxPrice,
    Math.max(0.5, Number(params.durationMinWeeks || 1)),
    Math.max(0.5, Number(params.durationMaxWeeks || 2)),
    now,
    now,
  );
  audit('service', id, 'create', params.actor, null, params);
  return id;
}

export function updateEstimatorService(params: {
  id: string;
  name: string;
  description: string;
  baseEffortDays: number;
  basePriceMin: number;
  basePriceMax: number;
  durationMinWeeks: number;
  durationMaxWeeks: number;
  active: boolean;
  actor: string;
}) {
  const db = getDatabase();
  const before = db.prepare('SELECT * FROM services WHERE id=?').get(params.id);
  if (!before) throw new Error('Service not found.');
  const values = [
    params.name.trim().slice(0, 180),
    params.description.trim().slice(0, 2000),
    Math.max(0.5, Math.min(1000, params.baseEffortDays)),
    Math.max(0, Math.trunc(params.basePriceMin)),
    Math.max(0, Math.trunc(params.basePriceMax)),
    Math.max(0.5, Math.min(260, params.durationMinWeeks)),
    Math.max(0.5, Math.min(260, params.durationMaxWeeks)),
    params.active ? 1 : 0,
    new Date().toISOString(),
    params.id,
  ];
  if (!values[0]) throw new Error('Service name is required.');
  if (Number(values[4]) < Number(values[3])) throw new Error('Maximum price must be greater than or equal to minimum price.');
  db.prepare(
    `UPDATE services SET name=?, description=?, base_effort_days=?, base_price_min=?, base_price_max=?,
      default_duration_min_weeks=?, default_duration_max_weeks=?, is_active=?, updated_at=? WHERE id=?`,
  ).run(...values);
  audit('service', params.id, 'update', params.actor, before, params);
}

export function updatePricingParameter(params: {
  key: string;
  value: number;
  actor: string;
}) {
  const db = getDatabase();
  const before = db.prepare('SELECT * FROM pricing_parameters WHERE key=?').get(params.key) as any;
  if (!before) throw new Error('Pricing parameter not found.');
  const value = Number(params.value);
  if (!Number.isFinite(value)) throw new Error('Invalid pricing value.');
  if (before.min_value != null && value < Number(before.min_value)) throw new Error('Value is below allowed minimum.');
  if (before.max_value != null && value > Number(before.max_value)) throw new Error('Value exceeds allowed maximum.');
  db.prepare('UPDATE pricing_parameters SET value=?, updated_at=? WHERE key=?').run(value, new Date().toISOString(), params.key);
  audit('pricing_parameter', params.key, 'update', params.actor, before, { ...before, value });
}

export function updateEstimatorSetting(params: {
  key: string;
  value: string;
  actor: string;
}) {
  const db = getDatabase();
  const before = db.prepare('SELECT * FROM estimator_settings WHERE key=?').get(params.key);
  if (!before) throw new Error('Estimator setting not found.');
  const value = params.value.trim().slice(0, 8000);
  db.prepare('UPDATE estimator_settings SET value=?, updated_at=? WHERE key=?').run(value, new Date().toISOString(), params.key);
  audit('estimator_setting', params.key, 'update', params.actor, before, { key: params.key, value });
}

export function createEstimatorQuestion(params: {
  serviceId?: string | null;
  key: string;
  label: string;
  helpText?: string;
  fieldType: string;
  required?: boolean;
  dimension?: string | null;
  weight?: number;
  sortOrder?: number;
  quickMode?: boolean;
  detailedMode?: boolean;
  actor: string;
}) {
  const db = getDatabase();
  const key = slugify(params.key).replace(/-/g, '_');
  const label = params.label.trim().slice(0, 500);
  if (!key || !label || !FIELD_TYPES.has(params.fieldType)) throw new Error('Question key, label and valid field type are required.');
  if (params.serviceId) {
    const service = db.prepare('SELECT id FROM services WHERE id=?').get(params.serviceId);
    if (!service) throw new Error('Service not found.');
  }
  const id = `q-${randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO estimator_questions
      (id, service_id, question_key, label, help_text, field_type, required,
       complexity_dimension, weight, sort_order, quick_mode, detailed_mode,
       is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  ).run(
    id,
    params.serviceId || null,
    key,
    label,
    params.helpText?.trim().slice(0, 1000) || null,
    params.fieldType,
    params.required ? 1 : 0,
    params.dimension || null,
    Math.max(0, Math.min(10, Number(params.weight ?? 1))),
    Math.trunc(params.sortOrder ?? 100),
    params.quickMode === false ? 0 : 1,
    params.detailedMode === false ? 0 : 1,
    now,
    now,
  );
  audit('estimator_question', id, 'create', params.actor, null, params);
  return id;
}

export function updateEstimatorQuestion(params: {
  id: string;
  label: string;
  helpText?: string;
  required: boolean;
  weight: number;
  quickMode: boolean;
  detailedMode: boolean;
  active: boolean;
  actor: string;
}) {
  const db = getDatabase();
  const before = db.prepare('SELECT * FROM estimator_questions WHERE id=?').get(params.id);
  if (!before) throw new Error('Question not found.');
  const label = params.label.trim().slice(0, 500);
  if (!label) throw new Error('Question label is required.');
  const weight = Math.max(0, Math.min(10, Number(params.weight)));
  db.prepare(
    `UPDATE estimator_questions
     SET label=?, help_text=?, required=?, weight=?, quick_mode=?, detailed_mode=?, is_active=?, updated_at=?
     WHERE id=?`,
  ).run(
    label,
    params.helpText?.trim().slice(0, 1000) || null,
    params.required ? 1 : 0,
    weight,
    params.quickMode ? 1 : 0,
    params.detailedMode ? 1 : 0,
    params.active ? 1 : 0,
    new Date().toISOString(),
    params.id,
  );
  audit('estimator_question', params.id, 'update', params.actor, before, params);
}

export function upsertQuestionOption(params: {
  id?: string;
  questionId: string;
  value: string;
  label: string;
  score: number;
  effortMultiplier: number;
  priceMultiplier: number;
  sortOrder?: number;
  active?: boolean;
  actor: string;
}) {
  const db = getDatabase();
  const question = db.prepare('SELECT id FROM estimator_questions WHERE id=?').get(params.questionId);
  if (!question) throw new Error('Question not found.');
  const id = params.id || `qo-${randomUUID()}`;
  const before = params.id ? db.prepare('SELECT * FROM estimator_question_options WHERE id=?').get(params.id) : null;
  const value = params.value.trim().slice(0, 160);
  const label = params.label.trim().slice(0, 500);
  if (!value || !label) throw new Error('Option value and label are required.');
  db.prepare(
    `INSERT INTO estimator_question_options
      (id, question_id, value, label, score, effort_multiplier, price_multiplier, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       question_id=excluded.question_id, value=excluded.value, label=excluded.label,
       score=excluded.score, effort_multiplier=excluded.effort_multiplier,
       price_multiplier=excluded.price_multiplier, sort_order=excluded.sort_order,
       is_active=excluded.is_active`,
  ).run(
    id,
    params.questionId,
    value,
    label,
    Math.max(1, Math.min(5, Number(params.score))),
    Math.max(0.1, Math.min(10, Number(params.effortMultiplier))),
    Math.max(0.1, Math.min(10, Number(params.priceMultiplier))),
    Math.trunc(params.sortOrder ?? 100),
    params.active === false ? 0 : 1,
  );
  audit('question_option', id, before ? 'update' : 'create', params.actor, before, params);
  return id;
}

export function upsertEstimatorRule(params: {
  id?: string;
  serviceId?: string | null;
  name: string;
  conditionsJson: string;
  effectsJson: string;
  sortOrder?: number;
  active?: boolean;
  actor: string;
}) {
  const db = getDatabase();
  const id = params.id || `rule-${randomUUID()}`;
  const before = params.id ? db.prepare('SELECT * FROM estimator_rules WHERE id=?').get(params.id) : null;
  if (params.serviceId && !db.prepare('SELECT id FROM services WHERE id=?').get(params.serviceId)) {
    throw new Error('Service not found.');
  }
  let conditions: unknown;
  let effects: unknown;
  try {
    conditions = JSON.parse(params.conditionsJson);
    effects = JSON.parse(params.effectsJson);
  } catch {
    throw new Error('Rule conditions and effects must be valid JSON.');
  }
  if (!Array.isArray(conditions) || !effects || typeof effects !== 'object' || Array.isArray(effects)) {
    throw new Error('Rule conditions must be an array and effects must be an object.');
  }
  const name = params.name.trim().slice(0, 240);
  if (!name) throw new Error('Rule name is required.');
  db.prepare(
    `INSERT INTO estimator_rules
      (id, service_id, name, condition_json, effects_json, sort_order, is_active, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       service_id=excluded.service_id, name=excluded.name, condition_json=excluded.condition_json,
       effects_json=excluded.effects_json, sort_order=excluded.sort_order,
       is_active=excluded.is_active, updated_at=excluded.updated_at`,
  ).run(
    id,
    params.serviceId || null,
    name,
    JSON.stringify(conditions),
    JSON.stringify(effects),
    Math.trunc(params.sortOrder ?? 100),
    params.active === false ? 0 : 1,
    new Date().toISOString(),
  );
  audit('estimator_rule', id, before ? 'update' : 'create', params.actor, before, params);
  return id;
}

export function upsertResourceRole(params: {
  id?: string;
  roleKey: string;
  name: string;
  internalDayRate?: number | null;
  active?: boolean;
  actor: string;
}) {
  const db = getDatabase();
  const id = params.id || `role-${randomUUID()}`;
  const before = params.id ? db.prepare('SELECT * FROM resource_roles WHERE id=?').get(params.id) : null;
  const roleKey = slugify(params.roleKey).replace(/-/g, '_');
  const name = params.name.trim().slice(0, 180);
  if (!roleKey || !name) throw new Error('Resource key and name are required.');
  db.prepare(
    `INSERT INTO resource_roles (id, role_key, name, internal_day_rate, is_active, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       role_key=excluded.role_key, name=excluded.name, internal_day_rate=excluded.internal_day_rate,
       is_active=excluded.is_active, updated_at=excluded.updated_at`,
  ).run(
    id,
    roleKey,
    name,
    params.internalDayRate == null ? null : Math.max(0, Math.trunc(params.internalDayRate)),
    params.active === false ? 0 : 1,
    new Date().toISOString(),
  );
  audit('resource_role', id, before ? 'update' : 'create', params.actor, before, params);
  return id;
}

export function upsertServiceResource(params: {
  serviceId: string;
  resourceRoleId: string;
  quantity: number;
  effortShare: number;
  actor: string;
}) {
  const db = getDatabase();
  if (!db.prepare('SELECT id FROM services WHERE id=?').get(params.serviceId)) throw new Error('Service not found.');
  if (!db.prepare('SELECT id FROM resource_roles WHERE id=?').get(params.resourceRoleId)) throw new Error('Resource role not found.');
  const before = db.prepare(
    'SELECT * FROM service_resource_defaults WHERE service_id=? AND resource_role_id=?',
  ).get(params.serviceId, params.resourceRoleId);
  db.prepare(
    `INSERT INTO service_resource_defaults (service_id, resource_role_id, quantity, effort_share)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(service_id, resource_role_id) DO UPDATE SET
       quantity=excluded.quantity, effort_share=excluded.effort_share`,
  ).run(
    params.serviceId,
    params.resourceRoleId,
    Math.max(0.1, Math.min(100, Number(params.quantity))),
    Math.max(0, Math.min(1, Number(params.effortShare))),
  );
  audit(
    'service_resource',
    `${params.serviceId}:${params.resourceRoleId}`,
    before ? 'update' : 'create',
    params.actor,
    before,
    params,
  );
}

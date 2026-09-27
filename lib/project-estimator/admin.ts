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
  questions: Array<{
    id: string;
    serviceId: string | null;
    serviceName: string;
    key: string;
    label: string;
    fieldType: string;
    required: boolean;
    dimension: string | null;
    weight: number;
    quickMode: boolean;
    detailedMode: boolean;
    active: boolean;
  }>;
};

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

  const questions = db.prepare(
    `SELECT q.id, q.service_id, COALESCE(s.name, 'Common / all services') AS service_name,
            q.question_key, q.label, q.field_type, q.required, q.complexity_dimension,
            q.weight, q.quick_mode, q.detailed_mode, q.is_active
     FROM estimator_questions q
     LEFT JOIN services s ON s.id=q.service_id
     ORDER BY COALESCE(s.name, ''), q.sort_order, q.label`,
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
    questions: questions.map((row) => ({
      id: row.id,
      serviceId: row.service_id || null,
      serviceName: row.service_name,
      key: row.question_key,
      label: row.label,
      fieldType: row.field_type,
      required: Number(row.required) === 1,
      dimension: row.complexity_dimension || null,
      weight: Number(row.weight),
      quickMode: Number(row.quick_mode) === 1,
      detailedMode: Number(row.detailed_mode) === 1,
      active: Number(row.is_active) === 1,
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

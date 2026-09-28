import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { getRuntimeDatabase } from '@/lib/server/runtime-database';
import { generateAiWithFailover } from '@/lib/ai/provider-router';
import { calculateLeadScore, type Lead } from '@/lib/scoring/leads';
import { createPersistentLead } from '@/lib/data/lead-repository';
import { sendRfqNotifications } from '@/lib/project-estimator/notifications';
import type {
  EstimatorBootstrap,
  EstimatorQuestion,
  EstimatorService,
  ProjectEstimate,
  QuestionOption,
  RfqContent,
  RfqRecord,
  SessionInput,
} from '@/lib/project-estimator/types';

type ServiceRow = {
  id: string;
  category_id: string;
  category_name: string;
  slug: string;
  name: string;
  description: string | null;
  base_effort_days: number;
  base_price_min: number;
  base_price_max: number;
  billing_unit: string;
  default_duration_min_weeks: number;
  default_duration_max_weeks: number;
};

type QuestionRow = {
  id: string;
  service_id: string | null;
  question_key: string;
  label: string;
  help_text: string | null;
  field_type: EstimatorQuestion['fieldType'];
  required: number;
  complexity_dimension: string | null;
  weight: number;
  sort_order: number;
  quick_mode: number;
  detailed_mode: number;
};

type OptionRow = {
  id: string;
  question_id: string;
  value: string;
  label: string;
  score: number;
  effort_multiplier: number;
  price_multiplier: number;
};

type ConditionRow = {
  id: string;
  question_id: string;
  source_question_key: string;
  operator: string;
  compare_value: string | null;
};

function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function hashResumeToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function safeTokenEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function verifyEstimatorSessionAccess(sessionId: string, resumeToken: string) {
  if (!sessionId || !resumeToken) return false;
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<{ secure_token_hash?: string | null }>(
    'SELECT secure_token_hash FROM estimator_sessions WHERE id=?',
    [sessionId],
  );
  if (!row?.secure_token_hash) return false;
  return safeTokenEqual(row.secure_token_hash, hashResumeToken(resumeToken));
}

export async function verifyRfqAccess(rfqId: string, resumeToken: string) {
  if (!rfqId || !resumeToken) return false;
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<{ session_id: string; secure_token_hash: string | null }>(
    `SELECT es.id AS session_id, es.secure_token_hash
     FROM rfqs r
     JOIN estimator_sessions es ON es.id=r.session_id
     WHERE r.id=?`,
    [rfqId],
  );
  return Boolean(row?.secure_token_hash) &&
    safeTokenEqual(row!.secure_token_hash!, hashResumeToken(resumeToken));
}

async function getSetting(key: string, fallback = ''): Promise<string> {
  try {
    const db = await getRuntimeDatabase();
    const row = await db.queryOne<{ value?: string }>(
      'SELECT value FROM estimator_settings WHERE key = ?',
      [key],
    );
    return typeof row?.value === 'string' ? row.value : fallback;
  } catch {
    return fallback;
  }
}

async function getNumberSetting(
  key: string,
  fallback: number,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
) {
  const raw = Number(await getSetting(key, String(fallback)));
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

function serviceFromRow(row: ServiceRow): EstimatorService {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    slug: row.slug,
    name: row.name,
    description: row.description || undefined,
    baseEffortDays: Number(row.base_effort_days),
    basePriceMin: Number(row.base_price_min),
    basePriceMax: Number(row.base_price_max),
    billingUnit: row.billing_unit,
    durationMinWeeks: Number(row.default_duration_min_weeks),
    durationMaxWeeks: Number(row.default_duration_max_weeks),
  };
}

async function loadServiceRecommendations(serviceId: string): Promise<ProjectEstimate['recommendations']> {
  const db = await getRuntimeDatabase();
  const rows = await db.queryAll<{
    related_service_id: string;
    name: string;
    relation_type: 'requires' | 'recommends';
    reason: string | null;
  }>(
    `SELECT d.related_service_id, s.name, d.relation_type, d.reason
     FROM service_dependencies d
     JOIN services s ON s.id = d.related_service_id
     WHERE d.service_id = ? AND d.is_active = 1 AND s.is_active = 1
     ORDER BY d.sort_order, s.name`,
    [serviceId],
  );

  return rows.map((row) => ({
    serviceId: row.related_service_id,
    name: row.name,
    relationType: row.relation_type,
    reason: row.reason || 'Related RTI service for the selected project scope.',
  }));
}

function buildQuestions(
  rows: QuestionRow[],
  options: OptionRow[],
  conditions: ConditionRow[] = [],
): EstimatorQuestion[] {
  const byQuestion = new Map<string, QuestionOption[]>();
  const conditionsByQuestion = new Map<string, EstimatorQuestion['conditions']>();
  for (const row of conditions) {
    const list = conditionsByQuestion.get(row.question_id) || [];
    list.push({
      sourceKey: row.source_question_key,
      operator: row.operator,
      compareValue: row.compare_value || undefined,
    });
    conditionsByQuestion.set(row.question_id, list);
  }

  for (const row of options) {
    const list = byQuestion.get(row.question_id) || [];
    list.push({
      id: row.id,
      value: row.value,
      label: row.label,
      score: Number(row.score),
      effortMultiplier: Number(row.effort_multiplier),
      priceMultiplier: Number(row.price_multiplier),
    });
    byQuestion.set(row.question_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    serviceId: row.service_id || undefined,
    key: row.question_key,
    label: row.label,
    helpText: row.help_text || undefined,
    fieldType: row.field_type,
    required: Number(row.required) === 1,
    complexityDimension: row.complexity_dimension || undefined,
    weight: Number(row.weight),
    sortOrder: Number(row.sort_order),
    quickMode: Number(row.quick_mode) === 1,
    detailedMode: Number(row.detailed_mode) === 1,
    options: (byQuestion.get(row.id) || []).sort((a, b) => a.label.localeCompare(b.label)),
    conditions: conditionsByQuestion.get(row.id) || [],
  }));
}

async function audit(entityType: string, entityId: string, action: string, after?: unknown, actor = 'public') {
  const db = await getRuntimeDatabase();
  await db.run(
    `INSERT INTO estimator_audit_logs
      (id, entity_type, entity_id, action, actor, before_json, after_json, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
    [
      randomUUID(),
      entityType,
      entityId,
      action,
      actor,
      after ? JSON.stringify(after) : null,
      new Date().toISOString(),
    ],
  );
}

export async function trackEstimatorEvent(
  sessionId: string,
  eventType: string,
  metadata?: Record<string, unknown>,
  rfqId?: string,
) {
  const db = await getRuntimeDatabase();
  await db.run(
    `INSERT INTO estimator_events
      (id, session_id, rfq_id, event_type, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      sessionId || null,
      rfqId || null,
      eventType.trim().slice(0, 80),
      metadata ? JSON.stringify(metadata) : null,
      new Date().toISOString(),
    ],
  );
}

export async function getEstimatorBootstrap(): Promise<EstimatorBootstrap> {
  const db = await getRuntimeDatabase();
  const [categories, serviceRows, questionRows, optionRows, conditionRows, dimensions, publicSettingRows] =
    await Promise.all([
      db.queryAll<{ id: string; slug: string; name: string; description: string | null }>(
        `SELECT id, slug, name, description
         FROM service_categories
         WHERE is_active = 1
         ORDER BY sort_order, name`,
      ),
      db.queryAll<ServiceRow>(
        `SELECT s.id, s.category_id, c.name AS category_name, s.slug, s.name, s.description,
                s.base_effort_days, s.base_price_min, s.base_price_max, s.billing_unit,
                s.default_duration_min_weeks, s.default_duration_max_weeks
         FROM services s
         JOIN service_categories c ON c.id = s.category_id
         WHERE s.is_active = 1 AND c.is_active = 1
         ORDER BY c.sort_order, s.name`,
      ),
      db.queryAll<QuestionRow>(
        `SELECT id, service_id, question_key, label, help_text, field_type, required,
                complexity_dimension, weight, sort_order, quick_mode, detailed_mode
         FROM estimator_questions
         WHERE is_active = 1
         ORDER BY sort_order, label`,
      ),
      db.queryAll<OptionRow>(
        `SELECT id, question_id, value, label, score, effort_multiplier, price_multiplier
         FROM estimator_question_options
         WHERE is_active = 1
         ORDER BY sort_order, label`,
      ),
      db.queryAll<ConditionRow>(
        `SELECT id, question_id, source_question_key, operator, compare_value
         FROM estimator_question_conditions
         WHERE is_active = 1
         ORDER BY id`,
      ),
      db.queryAll<{ key: string; label: string; weight: number }>(
        `SELECT dimension AS key, label, weight
         FROM complexity_weights
         WHERE is_active = 1
         ORDER BY sort_order`,
      ),
      db.queryAll<{ key: string; value: string }>(
        'SELECT key, value FROM estimator_settings WHERE is_public = 1 ORDER BY key',
      ),
    ]);

  return {
    categories: categories.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description || undefined,
    })),
    services: serviceRows.map(serviceFromRow),
    questions: buildQuestions(questionRows, optionRows, conditionRows),
    dimensions: dimensions.map((row) => ({ ...row, weight: Number(row.weight) })),
    publicSettings: Object.fromEntries(publicSettingRows.map((row) => [row.key, row.value])),
  };
}

export async function validateEstimatorSessionInput(input: SessionInput): Promise<string[]> {
  const errors: string[] = [];
  const db = await getRuntimeDatabase();

  const [service, questions, optionRows] = await Promise.all([
    db.queryOne<{ id: string }>(
      'SELECT id FROM services WHERE id=? AND is_active=1',
      [input.serviceId],
    ),
    db.queryAll<{ id: string; question_key: string; field_type: string }>(
      `SELECT id, question_key, field_type
       FROM estimator_questions
       WHERE is_active=1 AND (service_id IS NULL OR service_id=?)`,
      [input.serviceId],
    ),
    db.queryAll<{ question_key: string; value: string }>(
      `SELECT q.question_key, o.value
       FROM estimator_question_options o
       JOIN estimator_questions q ON q.id=o.question_id
       WHERE o.is_active=1 AND q.is_active=1 AND (q.service_id IS NULL OR q.service_id=?)`,
      [input.serviceId],
    ),
  ]);

  if (!service) errors.push('Selected RTI service is not active.');

  if (!Array.isArray(input.businessObjectives) || input.businessObjectives.length > 50) {
    errors.push('Business objectives are invalid.');
  } else if (input.businessObjectives.some((item) => typeof item !== 'string' || item.length > 160)) {
    errors.push('Business objective values are invalid.');
  }

  const textFields: Array<[unknown, number, string]> = [
    [input.projectName, 180, 'Project name'],
    [input.targetTimeline, 240, 'Target timeline'],
    [input.budgetExpectation, 240, 'Budget expectation'],
    [input.profile?.companyName, 180, 'Company name'],
    [input.profile?.industry, 120, 'Industry'],
    [input.profile?.companySize, 80, 'Company size'],
    [input.profile?.location, 240, 'Location'],
    [input.profile?.country, 120, 'Country'],
    [input.profile?.website, 500, 'Website'],
    [input.profile?.contactName, 120, 'Contact name'],
    [input.profile?.contactTitle, 160, 'Contact title'],
    [input.profile?.department, 160, 'Department'],
    [input.profile?.email, 254, 'Email'],
    [input.profile?.phone, 80, 'Phone'],
    [input.profile?.whatsapp, 80, 'WhatsApp'],
    [input.profile?.preferredChannel, 80, 'Preferred channel'],
  ];
  for (const [value, max, label] of textFields) {
    if (value == null || value === '') continue;
    if (typeof value !== 'string' || value.length > max) errors.push(`${label} is invalid.`);
  }

  for (const [value, label] of [
    [input.profile?.employeeCount, 'Employee count'],
    [input.profile?.officeCount, 'Office count'],
  ] as Array<[unknown, string]>) {
    if (value == null) continue;
    if (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100000000) {
      errors.push(`${label} is invalid.`);
    }
  }

  if (!input.answers || typeof input.answers !== 'object' || Array.isArray(input.answers)) {
    errors.push('Estimator answers are invalid.');
    return errors;
  }

  const answerEntries = Object.entries(input.answers);
  if (answerEntries.length > 250) {
    errors.push('Too many estimator answers were submitted.');
    return errors;
  }

  const byKey = new Map(questions.map((question) => [question.question_key, question]));
  const options = new Map<string, Set<string>>();
  for (const row of optionRows) {
    const values = options.get(row.question_key) || new Set<string>();
    values.add(row.value);
    options.set(row.question_key, values);
  }

  for (const [key, value] of answerEntries) {
    const question = byKey.get(key);
    if (!question) {
      errors.push(`Unknown estimator question: ${key}.`);
      continue;
    }
    const allowed = options.get(key);
    if (allowed?.size) {
      if (question.field_type === 'multiselect') {
        if (!Array.isArray(value) || value.length > 100 || value.some((item) => !allowed.has(String(item)))) {
          errors.push(`Invalid option submitted for ${key}.`);
        }
      } else if (!allowed.has(String(value))) {
        errors.push(`Invalid option submitted for ${key}.`);
      }
      continue;
    }

    if (question.field_type === 'checkbox') {
      if (typeof value !== 'boolean') errors.push(`Invalid boolean value for ${key}.`);
    } else if (['number','currency','slider'].includes(question.field_type)) {
      if (!Number.isFinite(Number(value)) || Math.abs(Number(value)) > 1000000000000) {
        errors.push(`Invalid numeric value for ${key}.`);
      }
    } else if (question.field_type === 'multiselect') {
      if (!Array.isArray(value) || value.length > 100 || value.some((item) => typeof item !== 'string' || item.length > 1000)) {
        errors.push(`Invalid multi-select value for ${key}.`);
      }
    } else if (typeof value !== 'string' || value.length > 8000) {
      errors.push(`Invalid text value for ${key}.`);
    }
  }

  return errors.slice(0, 12);
}

export async function upsertEstimatorSession(
  input: SessionInput,
  existingSessionId?: string,
  resumeToken?: string,
) {
  const db = await getRuntimeDatabase();
  const now = new Date().toISOString();
  const sessionId = existingSessionId || randomUUID();

  const existing = existingSessionId
    ? await db.queryOne<{
        id: string;
        organization_id: string | null;
        contact_id: string | null;
        secure_token_hash: string | null;
      }>(
        'SELECT id, organization_id, contact_id, secure_token_hash FROM estimator_sessions WHERE id = ?',
        [existingSessionId],
      )
    : null;

  if (existingSessionId && !existing) throw new Error('Estimator session not found.');
  if (
    existing &&
    (!resumeToken || !(await verifyEstimatorSessionAccess(existingSessionId!, resumeToken)))
  ) {
    throw new Error('Estimator draft access denied.');
  }

  const nextResumeToken = existing ? resumeToken! : randomBytes(32).toString('base64url');
  const secureTokenHash = existing?.secure_token_hash || hashResumeToken(nextResumeToken);
  const organizationId = existing?.organization_id || randomUUID();
  const contactId = existing?.contact_id || randomUUID();
  const sourceContextJson = input.sourceContext ? JSON.stringify(input.sourceContext) : null;
  if (sourceContextJson && sourceContextJson.length > 16000) {
    throw new Error('Diagnostic source context is too large.');
  }

  const questions = await db.queryAll<{ id: string; question_key: string }>(
    `SELECT id, question_key FROM estimator_questions
     WHERE is_active = 1 AND (service_id IS NULL OR service_id = ?)`,
    [input.serviceId],
  );

  const statements = [
    {
      sql: `INSERT INTO organizations
        (id, name, industry, company_size, employee_count, office_count, location, country, website, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, industry=excluded.industry, company_size=excluded.company_size,
         employee_count=excluded.employee_count, office_count=excluded.office_count,
         location=excluded.location, country=excluded.country, website=excluded.website,
         updated_at=excluded.updated_at`,
      params: [
        organizationId,
        input.profile.companyName,
        input.profile.industry,
        input.profile.companySize || null,
        input.profile.employeeCount ?? null,
        input.profile.officeCount ?? null,
        input.profile.location || null,
        input.profile.country || null,
        input.profile.website || null,
        now,
        now,
      ],
    },
    {
      sql: `INSERT INTO contacts
        (id, organization_id, name, title, department, email, phone, whatsapp, preferred_channel, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         organization_id=excluded.organization_id, name=excluded.name, title=excluded.title,
         department=excluded.department, email=excluded.email, phone=excluded.phone,
         whatsapp=excluded.whatsapp, preferred_channel=excluded.preferred_channel,
         updated_at=excluded.updated_at`,
      params: [
        contactId,
        organizationId,
        input.profile.contactName,
        input.profile.contactTitle || null,
        input.profile.department || null,
        input.profile.email,
        input.profile.phone || null,
        input.profile.whatsapp || null,
        input.profile.preferredChannel || null,
        now,
        now,
      ],
    },
    {
      sql: `INSERT INTO estimator_sessions
        (id, mode, organization_id, contact_id, project_name, business_objectives_json,
         selected_service_id, target_timeline, budget_expectation, source_context_json,
         status, secure_token_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         mode=excluded.mode, organization_id=excluded.organization_id, contact_id=excluded.contact_id,
         project_name=excluded.project_name, business_objectives_json=excluded.business_objectives_json,
         selected_service_id=excluded.selected_service_id, target_timeline=excluded.target_timeline,
         budget_expectation=excluded.budget_expectation, source_context_json=excluded.source_context_json,
         updated_at=excluded.updated_at`,
      params: [
        sessionId,
        input.mode,
        organizationId,
        contactId,
        input.projectName,
        JSON.stringify(input.businessObjectives || []),
        input.serviceId,
        input.targetTimeline || null,
        input.budgetExpectation || null,
        sourceContextJson,
        secureTokenHash,
        now,
        now,
      ],
    },
    ...questions
      .filter((question) => question.question_key in input.answers)
      .map((question) => ({
        sql: `INSERT INTO estimator_answers (session_id, question_id, answer_json, updated_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(session_id, question_id) DO UPDATE SET
                answer_json=excluded.answer_json, updated_at=excluded.updated_at`,
        params: [
          sessionId,
          question.id,
          JSON.stringify(input.answers[question.question_key] ?? null),
          now,
        ],
      })),
  ];

  await db.batch(statements);
  await audit('estimator_session', sessionId, existing ? 'update' : 'create', {
    mode: input.mode,
    serviceId: input.serviceId,
  });
  await trackEstimatorEvent(
    sessionId,
    existing ? 'DRAFT_SAVED' : 'ESTIMATOR_STARTED',
    { mode: input.mode, serviceId: input.serviceId },
  );

  return { sessionId, resumeToken: nextResumeToken };
}

export async function getEstimatorSessionByToken(resumeToken: string) {
  if (!resumeToken) throw new Error('Resume token is required.');
  const tokenHash = hashResumeToken(resumeToken);
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<any>(
    `SELECT es.id, es.mode, es.project_name, es.business_objectives_json, es.selected_service_id,
            es.target_timeline, es.budget_expectation, es.source_context_json,
            o.name AS company_name, o.industry, o.company_size, o.employee_count, o.office_count,
            o.location, o.country, o.website,
            c.name AS contact_name, c.title, c.department, c.email, c.phone, c.whatsapp, c.preferred_channel
     FROM estimator_sessions es
     JOIN organizations o ON o.id=es.organization_id
     JOIN contacts c ON c.id=es.contact_id
     WHERE es.secure_token_hash=?`,
    [tokenHash],
  );
  if (!row) throw new Error('Saved estimator draft not found.');

  const [answers, latestEstimate, latestRfq] = await Promise.all([
    db.queryAll<{ question_key: string; answer_json: string }>(
      `SELECT q.question_key, a.answer_json
       FROM estimator_answers a
       JOIN estimator_questions q ON q.id=a.question_id
       WHERE a.session_id=?`,
      [row.id],
    ),
    db.queryOne<any>(
      `SELECT pe.*, s.name AS service_name
       FROM project_estimates pe JOIN services s ON s.id=pe.service_id
       WHERE pe.session_id=? ORDER BY pe.version DESC LIMIT 1`,
      [row.id],
    ),
    db.queryOne<any>(
      `SELECT r.id, r.rfq_number, r.session_id, r.estimate_id, r.current_version,
              r.status, r.created_at, r.updated_at, rv.content_json
       FROM rfqs r
       JOIN rfq_versions rv ON rv.rfq_id=r.id AND rv.version=r.current_version
       WHERE r.session_id=?
       ORDER BY r.updated_at DESC
       LIMIT 1`,
      [row.id],
    ),
  ]);

  const input: SessionInput = {
    mode: row.mode,
    projectName: row.project_name,
    businessObjectives: safeJson<string[]>(row.business_objectives_json, []),
    serviceId: row.selected_service_id,
    targetTimeline: row.target_timeline || undefined,
    budgetExpectation: row.budget_expectation || undefined,
    sourceContext: safeJson<Record<string, unknown> | undefined>(row.source_context_json, undefined),
    profile: {
      companyName: row.company_name,
      industry: row.industry || '',
      companySize: row.company_size || undefined,
      employeeCount: row.employee_count == null ? undefined : Number(row.employee_count),
      officeCount: row.office_count == null ? undefined : Number(row.office_count),
      location: row.location || undefined,
      country: row.country || undefined,
      website: row.website || undefined,
      contactName: row.contact_name,
      contactTitle: row.title || undefined,
      department: row.department || undefined,
      email: row.email,
      phone: row.phone || undefined,
      whatsapp: row.whatsapp || undefined,
      preferredChannel: row.preferred_channel || undefined,
    },
    answers: Object.fromEntries(
      answers.map((answer) => [answer.question_key, safeJson<unknown>(answer.answer_json, null)]),
    ),
  };

  return {
    sessionId: row.id,
    resumeToken,
    input,
    estimate: latestEstimate
      ? {
          id: latestEstimate.id,
          sessionId: latestEstimate.session_id,
          version: Number(latestEstimate.version),
          serviceId: latestEstimate.service_id,
          serviceName: latestEstimate.service_name,
          complexityIndex: Number(latestEstimate.complexity_index),
          complexityLevel: latestEstimate.complexity_level,
          projectSize: latestEstimate.project_size,
          effortDays: Number(latestEstimate.effort_days),
          durationMinWeeks: Number(latestEstimate.duration_min_weeks),
          durationMaxWeeks: Number(latestEstimate.duration_max_weeks),
          priceMin: Number(latestEstimate.price_min),
          priceMax: Number(latestEstimate.price_max),
          priceConfigured: Number(latestEstimate.price_max) > 0,
          readinessScore: Number(latestEstimate.readiness_score),
          team: safeJson(latestEstimate.team_json, []),
          factors: safeJson(latestEstimate.factors_json, []),
          recommendations: safeJson(latestEstimate.recommendations_json, []),
          createdAt: latestEstimate.created_at,
        }
      : null,
    rfq: latestRfq
      ? {
          id: latestRfq.id,
          rfqNumber: latestRfq.rfq_number,
          sessionId: latestRfq.session_id,
          estimateId: latestRfq.estimate_id,
          version: Number(latestRfq.current_version),
          status: latestRfq.status,
          content: safeJson<RfqContent>(latestRfq.content_json, {} as RfqContent),
          createdAt: latestRfq.created_at,
          updatedAt: latestRfq.updated_at,
        }
      : null,
  };
}

async function levelFromIndex(index: number): Promise<ProjectEstimate['complexityLevel']> {
  let veryLowMax = await getNumberSetting('complexity_threshold_very_low', 20, 0, 100);
  let lowMax = await getNumberSetting('complexity_threshold_low', 40, 0, 100);
  let moderateMax = await getNumberSetting('complexity_threshold_moderate', 60, 0, 100);
  let highMax = await getNumberSetting('complexity_threshold_high', 80, 0, 100);
  lowMax = Math.max(veryLowMax, lowMax);
  moderateMax = Math.max(lowMax, moderateMax);
  highMax = Math.max(moderateMax, highMax);
  if (index <= veryLowMax) return 'Very Low';
  if (index <= lowMax) return 'Low';
  if (index <= moderateMax) return 'Moderate';
  if (index <= highMax) return 'High';
  return 'Very High';
}

async function sizeFromEffort(effort: number): Promise<ProjectEstimate['projectSize']> {
  let microMax = await getNumberSetting('project_size_micro_max_effort', 5, 0);
  let smallMax = await getNumberSetting('project_size_small_max_effort', 15, 0);
  let mediumMax = await getNumberSetting('project_size_medium_max_effort', 35, 0);
  let largeMax = await getNumberSetting('project_size_large_max_effort', 70, 0);
  smallMax = Math.max(microMax, smallMax);
  mediumMax = Math.max(smallMax, mediumMax);
  largeMax = Math.max(mediumMax, largeMax);
  if (effort <= microMax) return 'Micro';
  if (effort <= smallMax) return 'Small';
  if (effort <= mediumMax) return 'Medium';
  if (effort <= largeMax) return 'Large';
  return 'Enterprise';
}

async function priceMultiplierForLevel(level: ProjectEstimate['complexityLevel']) {
  const key =
    level === 'Very High'
      ? 'complexity_multiplier_very_high'
      : level === 'High'
        ? 'complexity_multiplier_high'
        : level === 'Moderate'
          ? 'complexity_multiplier_moderate'
          : 'complexity_multiplier_low';
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<{ value: number }>(
    'SELECT value FROM pricing_parameters WHERE key = ?',
    [key],
  );
  return Number(row?.value || 1);
}

type RuleCondition = {
  field: string;
  operator?: 'equals' | 'not_equals' | 'includes' | 'in' | 'gt' | 'gte' | 'lt' | 'lte' | 'truthy';
  value?: unknown;
};

type RuleEffects = {
  complexityDelta?: number;
  effortMultiplier?: number;
  priceMultiplier?: number;
  durationMultiplier?: number;
  factor?: string;
};

function matchesRuleCondition(condition: RuleCondition, answers: Map<string, unknown>) {
  const actual = answers.get(condition.field);
  const operator = condition.operator || 'equals';
  if (operator === 'truthy') return Boolean(actual);
  if (operator === 'equals') return String(actual) === String(condition.value);
  if (operator === 'not_equals') return String(actual) !== String(condition.value);
  if (operator === 'includes') {
    return Array.isArray(actual)
      ? actual.map(String).includes(String(condition.value))
      : String(actual || '').includes(String(condition.value || ''));
  }
  if (operator === 'in') {
    return Array.isArray(condition.value) && condition.value.map(String).includes(String(actual));
  }
  const left = Number(actual);
  const right = Number(condition.value);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  if (operator === 'gt') return left > right;
  if (operator === 'gte') return left >= right;
  if (operator === 'lt') return left < right;
  if (operator === 'lte') return left <= right;
  return false;
}

async function evaluateRules(serviceId: string, answers: Map<string, unknown>) {
  const db = await getRuntimeDatabase();
  const rows = await db.queryAll<{
    id: string;
    name: string;
    condition_json: string;
    effects_json: string;
  }>(
    `SELECT id, name, condition_json, effects_json
     FROM estimator_rules
     WHERE is_active = 1 AND (service_id IS NULL OR service_id = ?)
     ORDER BY sort_order, name`,
    [serviceId],
  );

  let complexityDelta = 0;
  let effortMultiplier = 1;
  let priceMultiplier = 1;
  let durationMultiplier = 1;
  const factors: string[] = [];
  const appliedRules: string[] = [];

  for (const row of rows) {
    const conditions = safeJson<RuleCondition[]>(row.condition_json, []);
    if (!conditions.every((condition) => matchesRuleCondition(condition, answers))) continue;
    const effects = safeJson<RuleEffects>(row.effects_json, {});
    complexityDelta += Number(effects.complexityDelta || 0);
    effortMultiplier *= Number(effects.effortMultiplier || 1);
    priceMultiplier *= Number(effects.priceMultiplier || 1);
    durationMultiplier *= Number(effects.durationMultiplier || 1);
    if (effects.factor) factors.push(effects.factor);
    appliedRules.push(row.id);
  }

  return { complexityDelta, effortMultiplier, priceMultiplier, durationMultiplier, factors, appliedRules };
}

function conditionValueMatches(operator: string, actual: unknown, compareValue?: string) {
  if (operator === 'truthy') return Boolean(actual);
  if (operator === 'falsy') return !actual;
  if (operator === 'not_equals') return String(actual) !== String(compareValue ?? '');
  if (operator === 'includes') {
    return Array.isArray(actual)
      ? actual.map(String).includes(String(compareValue ?? ''))
      : String(actual ?? '').includes(String(compareValue ?? ''));
  }
  if (operator === 'gt' || operator === 'gte' || operator === 'lt' || operator === 'lte') {
    const left = Number(actual);
    const right = Number(compareValue);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    if (operator === 'gt') return left > right;
    if (operator === 'gte') return left >= right;
    if (operator === 'lt') return left < right;
    return left <= right;
  }
  return String(actual) === String(compareValue ?? '');
}

function questionConditionsMatch(question: EstimatorQuestion, answers: Map<string, unknown>) {
  return question.conditions.every((condition) =>
    conditionValueMatches(
      condition.operator,
      answers.get(condition.sourceKey),
      condition.compareValue,
    ),
  );
}

async function loadSessionAnswers(
  sessionId: string,
  serviceId: string,
  mode: 'quick' | 'detailed',
) {
  const db = await getRuntimeDatabase();
  const [rows, options, conditions] = await Promise.all([
    db.queryAll<QuestionRow & { answer_json: string | null }>(
      `SELECT q.id, q.service_id, q.question_key, q.label, q.help_text, q.field_type, q.required,
              q.complexity_dimension, q.weight, q.sort_order, q.quick_mode, q.detailed_mode,
              a.answer_json
       FROM estimator_questions q
       LEFT JOIN estimator_answers a ON a.question_id = q.id AND a.session_id = ?
       WHERE q.is_active = 1
         AND (q.service_id IS NULL OR q.service_id = ?)
         AND (? = 'detailed' OR q.quick_mode = 1)
       ORDER BY q.sort_order, q.label`,
      [sessionId, serviceId, mode],
    ),
    db.queryAll<OptionRow>(
      `SELECT o.id, o.question_id, o.value, o.label, o.score, o.effort_multiplier, o.price_multiplier
       FROM estimator_question_options o
       JOIN estimator_questions q ON q.id = o.question_id
       WHERE o.is_active = 1 AND q.is_active = 1
         AND (q.service_id IS NULL OR q.service_id = ?)`,
      [serviceId],
    ),
    db.queryAll<ConditionRow>(
      `SELECT c.id, c.question_id, c.source_question_key, c.operator, c.compare_value
       FROM estimator_question_conditions c
       JOIN estimator_questions q ON q.id=c.question_id
       WHERE c.is_active=1 AND q.is_active=1
         AND (q.service_id IS NULL OR q.service_id = ?)`,
      [serviceId],
    ),
  ]);

  return { rows, questions: buildQuestions(rows, options, conditions) };
}

export function calculateEstimatorSession(sessionId: string): ProjectEstimate {
  const db = getDatabase();
  const session = db.prepare(
    `SELECT es.id, es.mode, es.project_name, es.selected_service_id, es.business_objectives_json,
            o.name AS company_name, o.industry, c.name AS contact_name, c.email,
            s.category_id, c.title AS contact_title
     FROM estimator_sessions es
     JOIN organizations o ON o.id = es.organization_id
     JOIN contacts c ON c.id = es.contact_id
     JOIN services s ON s.id = es.selected_service_id
     WHERE es.id = ?`,
  ).get(sessionId) as
    | {
        id: string;
        mode: 'quick' | 'detailed';
        project_name: string;
        selected_service_id: string;
        business_objectives_json: string;
        company_name: string;
        industry: string;
        contact_name: string;
        email: string;
        contact_title: string | null;
      }
    | undefined;

  if (!session) throw new Error('Estimator session not found.');

  const serviceRow = db.prepare(
    `SELECT s.id, s.category_id, c.name AS category_name, s.slug, s.name, s.description,
            s.base_effort_days, s.base_price_min, s.base_price_max, s.billing_unit,
            s.default_duration_min_weeks, s.default_duration_max_weeks
     FROM services s JOIN service_categories c ON c.id=s.category_id WHERE s.id=? AND s.is_active=1`,
  ).get(session.selected_service_id) as ServiceRow | undefined;
  if (!serviceRow) throw new Error('Selected service is not available.');
  const service = serviceFromRow(serviceRow);

  const { rows, questions } = loadSessionAnswers(sessionId, service.id, session.mode);
  const optionMap = new Map<string, OptionRow>();
  for (const question of questions) {
    for (const option of question.options) {
      optionMap.set(`${question.id}::${option.value}`, {
        id: option.id,
        question_id: question.id,
        value: option.value,
        label: option.label,
        score: option.score,
        effort_multiplier: option.effortMultiplier,
        price_multiplier: option.priceMultiplier,
      });
    }
  }

  let weightedScore = 0;
  let totalWeight = 0;
  const effortMultipliers: number[] = [];
  const priceMultipliers: number[] = [];
  const factors: string[] = [];
  let answeredRequired = 0;
  let requiredCount = 0;
  const answerMap = new Map<string, unknown>(
    rows.map((row) => [row.question_key, safeJson<unknown>(row.answer_json, null)]),
  );
  const questionById = new Map(questions.map((question) => [question.id, question]));

  for (const row of rows) {
    const question = questionById.get(row.id);
    if (question && !questionConditionsMatch(question, answerMap)) continue;
    const answer = answerMap.get(row.question_key);
    const hasAnswer = answer !== null && answer !== '' && answer !== false;
    if (Number(row.required) === 1) {
      requiredCount += 1;
      if (hasAnswer) answeredRequired += 1;
    }
    if (!hasAnswer || !row.complexity_dimension) continue;

    const option = optionMap.get(`${row.id}::${String(answer)}`);
    let score = option?.score ?? 3;
    if (!option && typeof answer === 'number') {
      score = Math.min(5, Math.max(1, answer <= 1 ? 1 : answer <= 5 ? 2 : answer <= 20 ? 3 : answer <= 60 ? 4 : 5));
    }

    const weight = Number(row.weight || 1);
    weightedScore += score * weight;
    totalWeight += weight;
    effortMultipliers.push(Number(option?.effort_multiplier || 1));
    priceMultipliers.push(Number(option?.price_multiplier || 1));
    if (score >= 4) factors.push(`${row.label}: ${option?.label || String(answer)}`);
  }

  const averageScore = totalWeight ? weightedScore / totalWeight : 3;
  const ruleResult = evaluateRules(service.id, answerMap);
  factors.push(...ruleResult.factors);
  const complexityIndex = Math.round(
    Math.min(100, Math.max(0, ((averageScore - 1) / 4) * 100 + ruleResult.complexityDelta)),
  );
  const complexityLevel = levelFromIndex(complexityIndex);
  const complexityMultiplier = priceMultiplierForLevel(complexityLevel);
  const effortFactor = (effortMultipliers.length
    ? effortMultipliers.reduce((sum, value) => sum + value, 0) / effortMultipliers.length
    : 1) * ruleResult.effortMultiplier;
  const priceFactor = (priceMultipliers.length
    ? priceMultipliers.reduce((sum, value) => sum + value, 0) / priceMultipliers.length
    : 1) * ruleResult.priceMultiplier;

  const effortDays = Math.max(1, Math.round(service.baseEffortDays * effortFactor * complexityMultiplier * 10) / 10);
  const scale = effortDays / Math.max(service.baseEffortDays, 1);
  const durationMinWeeks = Math.max(
    1,
    Math.round(service.durationMinWeeks * scale * ruleResult.durationMultiplier * 10) / 10,
  );
  const durationMaxWeeks = Math.max(
    durationMinWeeks,
    Math.round(service.durationMaxWeeks * scale * ruleResult.durationMultiplier * 10) / 10,
  );
  const priceConfigured = service.basePriceMin > 0 && service.basePriceMax >= service.basePriceMin;
  const priceMin = priceConfigured ? Math.max(0, Math.round(service.basePriceMin * priceFactor * complexityMultiplier)) : 0;
  const priceMax = priceConfigured ? Math.max(priceMin, Math.round(service.basePriceMax * priceFactor * complexityMultiplier)) : 0;
  const projectSize = sizeFromEffort(effortDays);

  const profileCompleteness =
    [session.company_name, session.industry, session.contact_name, session.email, session.project_name]
      .filter(Boolean).length / 5;
  const requiredCompleteness = requiredCount ? answeredRequired / requiredCount : 1;
  const requiredWeight = getNumberSetting('readiness_required_weight', 80, 0, 100);
  const profileWeight = getNumberSetting('readiness_profile_weight', 20, 0, 100);
  const readinessWeightTotal = Math.max(1, requiredWeight + profileWeight);
  const readinessScore = Math.round(
    ((requiredCompleteness * requiredWeight) + (profileCompleteness * profileWeight)) /
      readinessWeightTotal *
      100,
  );

  const resources = db.prepare(
    `SELECT rr.name, srd.quantity, srd.effort_share
     FROM service_resource_defaults srd
     JOIN resource_roles rr ON rr.id = srd.resource_role_id
     WHERE srd.service_id = ? AND rr.is_active = 1
     ORDER BY srd.effort_share DESC`,
  ).all(service.id) as Array<{ name: string; quantity: number; effort_share: number }>;

  const team = resources.length
    ? resources.map((row) => ({
        role: row.name,
        quantity: Number(row.quantity),
        estimatedDays: Math.max(1, Math.round((effortDays * Number(row.effort_share)) / Math.max(Number(row.quantity), 1))),
      }))
    : [{ role: 'Consultant / Specialist', quantity: 1, estimatedDays: Math.ceil(effortDays) }];

  const recommendations = loadServiceRecommendations(service.id);

  const prior = db.prepare('SELECT MAX(version) AS version FROM project_estimates WHERE session_id = ?').get(sessionId) as
    | { version: number | null }
    | undefined;
  const version = Number(prior?.version || 0) + 1;
  const estimateId = randomUUID();
  const now = new Date().toISOString();
  const trace = {
    baseEffortDays: service.baseEffortDays,
    averageScore: Math.round(averageScore * 100) / 100,
    complexityMultiplier,
    effortFactor: Math.round(effortFactor * 1000) / 1000,
    priceFactor: Math.round(priceFactor * 1000) / 1000,
    requiredAnswered: answeredRequired,
    requiredTotal: requiredCount,
    appliedRules: ruleResult.appliedRules,
  };

  db.prepare(
    `INSERT INTO project_estimates
      (id, session_id, version, service_id, complexity_index, complexity_level, project_size,
       effort_days, duration_min_weeks, duration_max_weeks, price_min, price_max,
       readiness_score, team_json, factors_json, recommendations_json, trace_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    estimateId,
    sessionId,
    version,
    service.id,
    complexityIndex,
    complexityLevel,
    projectSize,
    effortDays,
    durationMinWeeks,
    durationMaxWeeks,
    priceMin,
    priceMax,
    readinessScore,
    JSON.stringify(team),
    JSON.stringify(factors.slice(0, 6)),
    JSON.stringify(recommendations),
    JSON.stringify(trace),
    now,
  );

  db.prepare("UPDATE estimator_sessions SET status='estimated', updated_at=? WHERE id=?").run(now, sessionId);
  audit('project_estimate', estimateId, 'calculate', { version, complexityIndex, readinessScore });
  trackEstimatorEvent(sessionId, 'ESTIMATE_CALCULATED', {
    estimateId,
    version,
    serviceId: service.id,
    projectSize,
    complexityLevel,
    readinessScore,
  });

  return {
    id: estimateId,
    sessionId,
    version,
    serviceId: service.id,
    serviceName: service.name,
    complexityIndex,
    complexityLevel,
    projectSize,
    effortDays,
    durationMinWeeks,
    durationMaxWeeks,
    priceMin,
    priceMax,
    priceConfigured,
    readinessScore,
    team,
    factors: factors.slice(0, 6),
    recommendations,
    trace,
    createdAt: now,
  };
}

function answerLabel(question: EstimatorQuestion, answer: unknown) {
  const option = question.options.find((item) => item.value === String(answer));
  return option?.label || (typeof answer === 'string' ? answer : JSON.stringify(answer));
}

function createDeterministicRfqContent(sessionId: string, estimate: ProjectEstimate): RfqContent {
  const db = getDatabase();
  const session = db.prepare(
    `SELECT es.project_name, es.business_objectives_json, es.target_timeline, es.budget_expectation,
            o.name AS company_name, o.industry, c.name AS contact_name, s.name AS service_name
     FROM estimator_sessions es
     JOIN organizations o ON o.id=es.organization_id
     JOIN contacts c ON c.id=es.contact_id
     JOIN services s ON s.id=es.selected_service_id
     WHERE es.id=?`,
  ).get(sessionId) as {
    project_name: string;
    business_objectives_json: string;
    target_timeline: string | null;
    budget_expectation: string | null;
    company_name: string;
    industry: string;
    contact_name: string;
    service_name: string;
  };

  const { rows, questions } = loadSessionAnswers(sessionId, estimate.serviceId, 'detailed');
  const answerMap = new Map(rows.map((row) => [row.question_key, safeJson<unknown>(row.answer_json, null)]));
  const visibleQuestions = questions.filter((question) => questionConditionsMatch(question, answerMap));
  const answered = visibleQuestions
    .map((question) => ({ question, answer: answerMap.get(question.key) }))
    .filter((item) => item.answer !== null && item.answer !== '' && item.answer !== false);

  const missingInformation = visibleQuestions
    .filter((question) => question.required)
    .filter((question) => {
      const answer = answerMap.get(question.key);
      return answer === null || answer === undefined || answer === '' || answer === false;
    })
    .map((question) => question.label);

  const objectives = safeJson<string[]>(session.business_objectives_json, []);

  return {
    projectInformation: {
      projectName: session.project_name,
      company: session.company_name,
      industry: session.industry,
      contactPerson: session.contact_name,
      service: session.service_name,
    },
    background: `${session.company_name} is evaluating ${session.service_name} for ${session.project_name}. This RFQ draft is generated from the information provided through the RTI Project Estimator and requires review before formal submission.`,
    projectObjective: objectives,
    scopeOfWork: answered.map(({ question, answer }) => `${question.label}: ${answerLabel(question, answer)}`),
    technicalRequirements: answered
      .filter(({ question }) => ['technology', 'integration', 'security', 'data'].includes(question.complexityDimension || ''))
      .map(({ question, answer }) => `${question.label}: ${answerLabel(question, answer)}`),
    deliverables: [
      `${session.service_name} delivery aligned to the confirmed scope`,
      'Project kickoff and scope confirmation',
      'Progress / milestone reporting',
      'Final deliverables and executive handover',
    ],
    assumptions: [
      'Customer will provide timely access, information and authorized points of contact.',
      'The indicative estimate is subject to RTI technical and commercial review.',
      'Material scope changes may require estimate and RFQ version updates.',
    ],
    customerResponsibilities: [
      'Confirm scope and success criteria.',
      'Provide required access, documentation and stakeholder availability.',
      'Review and approve deliverables within agreed review windows.',
    ],
    rtiResponsibilities: [
      'Deliver services according to the mutually agreed statement of work.',
      'Protect customer information according to agreed security and confidentiality controls.',
      'Escalate material scope, risk or dependency changes.',
    ],
    timelineExpectation: session.target_timeline || `${estimate.durationMinWeeks}–${estimate.durationMaxWeeks} weeks (indicative)`,
    serviceLevelExpectation: 'To be confirmed during technical and commercial review.',
    complianceRequirement: answered
      .filter(({ question }) => question.complexityDimension === 'regulatory')
      .map(({ question, answer }) => answerLabel(question, answer))
      .join('; ') || 'To be confirmed.',
    securityRequirement: answered
      .filter(({ question }) => question.complexityDimension === 'security')
      .map(({ question, answer }) => answerLabel(question, answer))
      .join('; ') || 'Apply RTI secure delivery baseline and project-specific controls.',
    commercialRequirement: estimate.priceConfigured
      ? session.budget_expectation
        ? `Customer budget indication: ${session.budget_expectation}. Indicative estimate: IDR ${estimate.priceMin.toLocaleString('id-ID')} – IDR ${estimate.priceMax.toLocaleString('id-ID')}.`
        : `Indicative estimate: IDR ${estimate.priceMin.toLocaleString('id-ID')} – IDR ${estimate.priceMax.toLocaleString('id-ID')}. Final quotation is subject to RTI review.`
      : session.budget_expectation
        ? `Customer budget indication: ${session.budget_expectation}. RTI indicative pricing is pending internal commercial calibration and review.`
        : 'RTI indicative pricing is pending internal commercial calibration and review.',
    missingInformation,
  };
}

export async function createRfqDraft(params: {
  sessionId: string;
  estimateId: string;
  useAi?: boolean;
}): Promise<RfqRecord> {
  const db = getDatabase();
  const estimateRow = db.prepare(
    `SELECT pe.*, s.name AS service_name FROM project_estimates pe
     JOIN services s ON s.id=pe.service_id
     WHERE pe.id=? AND pe.session_id=?`,
  ).get(params.estimateId, params.sessionId) as any;
  if (!estimateRow) throw new Error('Estimate not found for session.');

  const estimate: ProjectEstimate = {
    id: estimateRow.id,
    sessionId: estimateRow.session_id,
    version: Number(estimateRow.version),
    serviceId: estimateRow.service_id,
    serviceName: estimateRow.service_name,
    complexityIndex: Number(estimateRow.complexity_index),
    complexityLevel: estimateRow.complexity_level,
    projectSize: estimateRow.project_size,
    effortDays: Number(estimateRow.effort_days),
    durationMinWeeks: Number(estimateRow.duration_min_weeks),
    durationMaxWeeks: Number(estimateRow.duration_max_weeks),
    priceMin: Number(estimateRow.price_min),
    priceMax: Number(estimateRow.price_max),
    priceConfigured: Number(estimateRow.price_max) > 0,
    readinessScore: Number(estimateRow.readiness_score),
    team: safeJson(estimateRow.team_json, []),
    factors: safeJson(estimateRow.factors_json, []),
    recommendations: safeJson(estimateRow.recommendations_json, []),
    trace: safeJson(estimateRow.trace_json, {}),
    createdAt: estimateRow.created_at,
  };

  const content = createDeterministicRfqContent(params.sessionId, estimate);
  let aiProvider: string | undefined;
  if (params.useAi) {
    const ai = await generateAiWithFailover({
      systemPrompt:
        'You support RTI pre-sales. Write a concise enterprise RFQ advisory note only. Do not invent facts, prices, commitments, certifications, laws, or customer requirements. Explicitly identify uncertainty.',
      contextText: JSON.stringify({ estimate: { ...estimate, trace: undefined }, rfq: content }),
      messages: [{ role: 'user', content: 'Create a short advisory note improving clarity of this RFQ draft. Maximum 180 words.' }],
    });
    if (ai?.text) {
      content.aiAssistedDraft = ai.text;
      aiProvider = ai.provider;
    }
  }

  const now = new Date().toISOString();
  const rfqId = randomUUID();
  const rfqPrefix = getSetting('rfq_prefix', 'RTI-RFQ').replace(/[^A-Za-z0-9-]/g, '').slice(0, 32) || 'RTI-RFQ';
  const rfqNumber = `${rfqPrefix}-${new Date().getUTCFullYear()}-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare(
      `INSERT INTO rfqs
        (id, rfq_number, session_id, estimate_id, current_version, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, 'draft', ?, ?)`,
    ).run(rfqId, rfqNumber, params.sessionId, params.estimateId, now, now);
    db.prepare(
      `INSERT INTO rfq_versions
        (id, rfq_id, version, content_json, ai_assisted, ai_provider, created_at)
       VALUES (?, ?, 1, ?, ?, ?, ?)`,
    ).run(randomUUID(), rfqId, JSON.stringify(content), content.aiAssistedDraft ? 1 : 0, aiProvider || null, now);
    db.prepare("UPDATE estimator_sessions SET status='rfq_draft', updated_at=? WHERE id=?").run(now, params.sessionId);
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  audit('rfq', rfqId, 'create_draft', { rfqNumber, estimateId: params.estimateId });
  trackEstimatorEvent(params.sessionId, 'RFQ_GENERATED', {
    rfqId,
    estimateId: params.estimateId,
    aiAssisted: Boolean(content.aiAssistedDraft),
  }, rfqId);

  return {
    id: rfqId,
    rfqNumber,
    sessionId: params.sessionId,
    estimateId: params.estimateId,
    version: 1,
    status: 'draft',
    content,
    createdAt: now,
    updatedAt: now,
  };
}

export function getRfq(rfqId: string): RfqRecord {
  const db = getDatabase();
  const row = db.prepare(
    `SELECT r.id, r.rfq_number, r.session_id, r.estimate_id, r.current_version, r.status,
            r.created_at, r.updated_at, rv.content_json
     FROM rfqs r
     JOIN rfq_versions rv ON rv.rfq_id=r.id AND rv.version=r.current_version
     WHERE r.id=?`,
  ).get(rfqId) as any;
  if (!row) throw new Error('RFQ not found.');
  return {
    id: row.id,
    rfqNumber: row.rfq_number,
    sessionId: row.session_id,
    estimateId: row.estimate_id,
    version: Number(row.current_version),
    status: row.status,
    content: safeJson<RfqContent>(row.content_json, {} as RfqContent),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function saveRfqVersion(rfqId: string, content: RfqContent, actor = 'customer'): RfqRecord {
  const db = getDatabase();
  const current = getRfq(rfqId);
  if (current.status !== 'draft') throw new Error('Only draft RFQs can be edited.');
  const nextVersion = current.version + 1;
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare(
      `INSERT INTO rfq_versions (id, rfq_id, version, content_json, ai_assisted, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(randomUUID(), rfqId, nextVersion, JSON.stringify(content), content.aiAssistedDraft ? 1 : 0, actor, now);
    db.prepare('UPDATE rfqs SET current_version=?, updated_at=? WHERE id=?').run(nextVersion, now, rfqId);
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
  audit('rfq', rfqId, 'new_version', { version: nextVersion }, actor);
  return getRfq(rfqId);
}

export async function submitRfq(rfqId: string) {
  const db = getDatabase();
  const rfq = getRfq(rfqId);
  if (rfq.status !== 'draft') return rfq;

  const context = db.prepare(
    `SELECT es.id AS session_id, es.project_name, es.organization_id,
            o.name AS company, o.industry, c.name, c.title, c.email, c.whatsapp,
            pe.price_min, pe.price_max, s.name AS service_name
     FROM rfqs r
     JOIN estimator_sessions es ON es.id=r.session_id
     JOIN organizations o ON o.id=es.organization_id
     JOIN contacts c ON c.id=es.contact_id
     JOIN project_estimates pe ON pe.id=r.estimate_id
     JOIN services s ON s.id=pe.service_id
     WHERE r.id=?`,
  ).get(rfqId) as any;

  const now = new Date().toISOString();
  const leadId = randomUUID();
  const lead: Lead = {
    id: leadId,
    createdAt: now,
    source: 'project-estimator-rfq',
    toolSlug: 'project-estimator',
    name: context.name,
    role: context.title || 'Project Contact',
    company: context.company,
    sector: context.industry || 'Other',
    email: context.email,
    whatsapp: context.whatsapp || undefined,
    needSummary: `RFQ ${rfq.rfqNumber}: ${context.project_name}`,
    score: calculateLeadScore({
      role: context.title || undefined,
      sector: context.industry || undefined,
      toolSlug: 'project-estimator',
      needSummary: context.project_name,
    }),
    status: 'New',
    consentAt: now,
    consentVersion: '1.0-UU-PDP',
  };
  await createPersistentLead(lead);

  const opportunityId = randomUUID();
  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare("UPDATE rfqs SET status='submitted', submitted_at=?, updated_at=? WHERE id=?").run(now, now, rfqId);
    db.prepare("UPDATE estimator_sessions SET status='submitted', updated_at=? WHERE id=?").run(now, context.session_id);
    db.prepare(
      `INSERT INTO opportunities
        (id, rfq_id, lead_id, organization_id, stage, estimated_value_min, estimated_value_max, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'New RFQ', ?, ?, ?, ?)`,
    ).run(opportunityId, rfqId, leadId, context.organization_id, context.price_min, context.price_max, now, now);
    db.prepare(
      `INSERT INTO lead_activities (id, opportunity_id, activity_type, note, actor, created_at)
       VALUES (?, ?, 'RFQ_SUBMITTED', ?, 'customer', ?)`,
    ).run(randomUUID(), opportunityId, `RFQ ${rfq.rfqNumber} submitted from public estimator.`, now);
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  audit('rfq', rfqId, 'submit', { leadId, opportunityId }, 'customer');
  trackEstimatorEvent(context.session_id, 'RFQ_SUBMITTED', { rfqId, leadId, opportunityId }, rfqId);
  await sendRfqNotifications({
    rfqNumber: rfq.rfqNumber,
    projectName: context.project_name,
    company: context.company,
    service: context.service_name,
    customerEmail: context.email,
  });
  return getRfq(rfqId);
}

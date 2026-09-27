import crypto from 'node:crypto';
import { getDatabase } from '@/lib/server/database';

type EntityName =
  | 'section'
  | 'question'
  | 'control'
  | 'response_option'
  | 'scoring_rule'
  | 'maturity_level'
  | 'gate'
  | 'evidence_status'
  | 'gap_rule'
  | 'roadmap_rule'
  | 'recommendation_rule'
  | 'service_mapping'
  | 'report_template'
  | 'ai_provider';

type EntityDefinition = {
  table: string;
  columns: string[];
  idColumn?: string;
};

const ENTITY: Record<EntityName, EntityDefinition> = {
  section: {
    table: 'assessment_sections',
    columns: ['code','title','domain','sort_order','is_quick'],
  },
  question: {
    table: 'assessment_questions',
    columns: [
      'question_code','clause_ref','domain','question_text','purpose','expected_evidence',
      'risk_if_missing','recommendation','criticality','weight','gate_key','is_quick',
      'applicability_rule','sort_order','status'
    ],
  },
  control: {
    table: 'annex_controls',
    columns: [
      'control_ref','domain','title','question_text','purpose','expected_evidence',
      'risk_if_missing','recommendation','criticality','weight','sort_order','status'
    ],
  },
  response_option: {
    table: 'response_options',
    columns: ['value','label','description','score','is_na','sort_order','status'],
  },
  scoring_rule: {
    table: 'scoring_rules',
    columns: ['rule_key','label','weight','config_json','is_active'],
  },
  maturity_level: {
    table: 'maturity_levels',
    columns: ['label','min_score','max_score','sort_order','status'],
  },
  gate: {
    table: 'readiness_gates',
    columns: ['gate_key','label','question_id','minimum_response','evidence_required','sort_order','is_active'],
  },
  evidence_status: {
    table: 'evidence_status_rules',
    columns: ['status_key','label','score_percent','sort_order','is_active'],
  },
  gap_rule: {
    table: 'gap_severity_rules',
    columns: ['criticality','maximum_response','severity','sort_order','is_active'],
  },
  roadmap_rule: {
    table: 'roadmap_phase_rules',
    columns: ['severity','phase','priority','is_active'],
  },
  recommendation_rule: {
    table: 'recommendation_rules',
    columns: ['match_key','severity','recommendation','service_code','is_active'],
  },
  service_mapping: {
    table: 'service_mappings',
    columns: ['match_key','service_name','cta_parameter_key','is_active'],
  },
  report_template: {
    table: 'report_templates',
    columns: ['name','header_text','footer_text','disclaimer_text','status'],
  },
  ai_provider: {
    table: 'ai_provider_configuration',
    columns: ['provider_key','model_name','priority','is_enabled','updated_at'],
  },
};

function cleanVersion(value: unknown) {
  return String(value || '').trim().slice(0, 120);
}

function adminAudit(
  action: string,
  objectType: string,
  objectId: string | null,
  oldValue?: unknown,
  newValue?: unknown,
) {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO audit_logs
      (id,organization_id,assessment_id,actor_type,actor_id,action,object_type,object_id,old_value,new_value,created_at)
    VALUES (?,NULL,NULL,'admin',NULL,?,?,?,?,?,?)
  `).run(
    crypto.randomUUID(),
    action,
    objectType,
    objectId,
    oldValue === undefined ? null : JSON.stringify(oldValue),
    newValue === undefined ? null : JSON.stringify(newValue),
    new Date().toISOString(),
  );
}

function assertEditableEntity(entity: EntityName, id: string) {
  if (entity === 'ai_provider') return;
  const db = getDatabase();
  const definition = ENTITY[entity];
  const row = db.prepare(`
    SELECT v.status
    FROM ${definition.table} e
    JOIN assessment_versions v ON v.id = e.version_id
    WHERE e.id = ?
  `).get(id) as { status?: string } | undefined;
  if (!row?.status) throw new Error('Configuration record not found.');
  if (!['Draft','Review'].includes(row.status)) {
    throw new Error('Published or archived framework versions are immutable. Clone the version before editing.');
  }
}

function assertEditableVersion(versionId: string) {
  const db = getDatabase();
  const row = db.prepare('SELECT status FROM assessment_versions WHERE id = ?').get(versionId) as { status?: string } | undefined;
  if (!row?.status) throw new Error('Assessment version not found.');
  if (!['Draft','Review'].includes(row.status)) {
    throw new Error('Published or archived framework versions are immutable. Clone the version before adding records.');
  }
}

function queryVersion(versionId?: string) {
  const db = getDatabase();
  if (versionId) {
    const row = db.prepare(`
      SELECT v.id, v.version, v.status, v.published_at AS publishedAt,
        v.created_at AS createdAt, v.updated_at AS updatedAt,
        t.name AS templateName, t.standard_version AS standardVersion
      FROM assessment_versions v
      JOIN assessment_templates t ON t.id = v.template_id
      WHERE v.id = ?
    `).get(versionId) as Record<string, unknown> | undefined;
    if (row) return row;
  }

  const row = db.prepare(`
    SELECT v.id, v.version, v.status, v.published_at AS publishedAt,
      v.created_at AS createdAt, v.updated_at AS updatedAt,
      t.name AS templateName, t.standard_version AS standardVersion
    FROM assessment_versions v
    JOIN assessment_templates t ON t.id = v.template_id
    WHERE t.slug = 'iso27001-readiness'
    ORDER BY CASE v.status WHEN 'Published' THEN 0 WHEN 'Review' THEN 1 WHEN 'Draft' THEN 2 ELSE 3 END,
      COALESCE(v.published_at, v.created_at) DESC
    LIMIT 1
  `).get() as Record<string, unknown> | undefined;

  if (!row) throw new Error('ISO 27001 assessment version is unavailable.');
  return row;
}

export function getIsoAdminSnapshot(versionId?: string) {
  const db = getDatabase();
  const selected = queryVersion(versionId);
  const id = String(selected.id);

  const versions = db.prepare(`
    SELECT v.id, v.version, v.status, v.published_at AS publishedAt,
      v.created_at AS createdAt, v.updated_at AS updatedAt
    FROM assessment_versions v
    JOIN assessment_templates t ON t.id = v.template_id
    WHERE t.slug = 'iso27001-readiness'
    ORDER BY v.created_at DESC
  `).all();

  const sections = db.prepare(`
    SELECT id, code, title, domain, sort_order AS sortOrder, is_quick AS isQuick
    FROM assessment_sections WHERE version_id = ? ORDER BY sort_order
  `).all(id);

  const auditLogs = db.prepare(`
    SELECT id, actor_type AS actorType, actor_id AS actorId, action, object_type AS objectType,
      object_id AS objectId, old_value AS oldValue, new_value AS newValue, created_at AS createdAt
    FROM audit_logs
    WHERE assessment_id IN (SELECT id FROM assessments WHERE version_id = ?)
       OR (assessment_id IS NULL AND object_type LIKE 'iso27001%')
    ORDER BY created_at DESC
    LIMIT 200
  `).all(id);

  const questions = db.prepare(`
    SELECT id, section_id AS sectionId, question_code AS questionCode, clause_ref AS clauseRef,
      domain, question_text AS questionText, purpose, expected_evidence AS expectedEvidence,
      risk_if_missing AS riskIfMissing, recommendation, criticality, weight, gate_key AS gateKey,
      is_quick AS isQuick, applicability_rule AS applicabilityRule, sort_order AS sortOrder,
      status, created_at AS createdAt, updated_at AS updatedAt
    FROM assessment_questions WHERE version_id = ? ORDER BY sort_order, question_code
  `).all(id);

  const controls = db.prepare(`
    SELECT id, control_ref AS controlRef, domain, title, question_text AS questionText,
      purpose, expected_evidence AS expectedEvidence, risk_if_missing AS riskIfMissing,
      recommendation, criticality, weight, sort_order AS sortOrder, status
    FROM annex_controls WHERE version_id = ? ORDER BY sort_order, control_ref
  `).all(id);

  const responseOptions = db.prepare(`
    SELECT id, value, label, description, score, is_na AS isNA, sort_order AS sortOrder, status
    FROM response_options WHERE version_id = ? ORDER BY sort_order
  `).all(id);

  const scoringRules = db.prepare(`
    SELECT id, rule_key AS ruleKey, label, weight, config_json AS configJson, is_active AS isActive
    FROM scoring_rules WHERE version_id = ? ORDER BY rule_key
  `).all(id);

  const maturityLevels = db.prepare(`
    SELECT id, label, min_score AS minScore, max_score AS maxScore, sort_order AS sortOrder, status
    FROM maturity_levels WHERE version_id = ? ORDER BY sort_order
  `).all(id);

  const gates = db.prepare(`
    SELECT id, gate_key AS gateKey, label, question_id AS questionId,
      minimum_response AS minimumResponse, evidence_required AS evidenceRequired,
      sort_order AS sortOrder, is_active AS isActive
    FROM readiness_gates WHERE version_id = ? ORDER BY sort_order
  `).all(id);

  const evidenceStatuses = db.prepare(`
    SELECT id, status_key AS statusKey, label, score_percent AS scorePercent,
      sort_order AS sortOrder, is_active AS isActive
    FROM evidence_status_rules WHERE version_id = ? ORDER BY sort_order
  `).all(id);

  const gapRules = db.prepare(`
    SELECT id, criticality, maximum_response AS maximumResponse, severity,
      sort_order AS sortOrder, is_active AS isActive
    FROM gap_severity_rules WHERE version_id = ? ORDER BY sort_order
  `).all(id);

  const roadmapRules = db.prepare(`
    SELECT id, severity, phase, priority, is_active AS isActive
    FROM roadmap_phase_rules WHERE version_id = ? ORDER BY priority
  `).all(id);

  const recommendationRules = db.prepare(`
    SELECT id, match_key AS matchKey, severity, recommendation, service_code AS serviceCode,
      is_active AS isActive
    FROM recommendation_rules WHERE version_id = ? ORDER BY id
  `).all(id);

  const serviceMappings = db.prepare(`
    SELECT id, match_key AS matchKey, service_name AS serviceName,
      cta_parameter_key AS ctaParameterKey, is_active AS isActive
    FROM service_mappings WHERE version_id = ? ORDER BY id
  `).all(id);

  const reportTemplates = db.prepare(`
    SELECT id, name, header_text AS headerText, footer_text AS footerText,
      disclaimer_text AS disclaimerText, status
    FROM report_templates WHERE version_id = ? ORDER BY id
  `).all(id);

  const aiProviders = db.prepare(`
    SELECT id, provider_key AS providerKey, model_name AS modelName, priority,
      is_enabled AS isEnabled, updated_at AS updatedAt
    FROM ai_provider_configuration ORDER BY priority, provider_key
  `).all();

  const statistics = {
    questions: Number((db.prepare('SELECT COUNT(*) AS c FROM assessment_questions WHERE version_id = ?').get(id) as { c: number }).c),
    annexControls: Number((db.prepare('SELECT COUNT(*) AS c FROM annex_controls WHERE version_id = ?').get(id) as { c: number }).c),
    quickQuestions: Number((db.prepare("SELECT COUNT(*) AS c FROM assessment_questions WHERE version_id = ? AND is_quick = 1 AND status = 'active'").get(id) as { c: number }).c),
    assessments: Number((db.prepare('SELECT COUNT(*) AS c FROM assessments WHERE version_id = ?').get(id) as { c: number }).c),
  };

  return {
    selectedVersion: selected,
    versions,
    statistics,
    sections,
    auditLogs,
    questions,
    controls,
    responseOptions,
    scoringRules,
    maturityLevels,
    gates,
    evidenceStatuses,
    gapRules,
    roadmapRules,
    recommendationRules,
    serviceMappings,
    reportTemplates,
    aiProviders,
  };
}

function dbColumnName(key: string) {
  return key.replace(/[A-Z]/g, (letter) => '_' + letter.toLowerCase());
}

function normalizePatch(entity: EntityName, patch: Record<string, unknown>) {
  const definition = ENTITY[entity];
  const normalized: Record<string, unknown> = {};

  for (const allowed of definition.columns) {
    const camel = allowed.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (Object.prototype.hasOwnProperty.call(patch, camel)) normalized[allowed] = patch[camel];
    else if (Object.prototype.hasOwnProperty.call(patch, allowed)) normalized[allowed] = patch[allowed];
  }

  if (Object.keys(normalized).length === 0) throw new Error('No editable fields supplied.');
  return normalized;
}

export function updateIsoAdminEntity(entity: EntityName, id: string, patch: Record<string, unknown>) {
  const db = getDatabase();
  const definition = ENTITY[entity];
  if (!definition) throw new Error('Unsupported ISO admin entity.');

  assertEditableEntity(entity, id);
  const normalized = normalizePatch(entity, patch);
  const before = db.prepare(`SELECT * FROM ${definition.table} WHERE id = ?`).get(id);
  if (entity === 'question') normalized.updated_at = new Date().toISOString();
  if (entity === 'ai_provider') normalized.updated_at = new Date().toISOString();

  const keys = Object.keys(normalized);
  const set = keys.map((key) => `${key} = ?`).join(', ');
  db.prepare(`UPDATE ${definition.table} SET ${set} WHERE id = ?`).run(...keys.map((key) => normalized[key]), id);
  adminAudit('admin.config.updated', 'iso27001_' + entity, id, before, normalized);

  return { id, entity, updated: normalized };
}

export function createIsoAdminEntity(entity: EntityName, versionId: string, input: Record<string, unknown>) {
  const db = getDatabase();
  const definition = ENTITY[entity];
  if (!definition) throw new Error('Unsupported ISO admin entity.');
  if (entity === 'ai_provider') throw new Error('AI providers are pre-registered; update them instead.');
  assertEditableVersion(versionId);

  const id = crypto.randomUUID();
  const normalized = normalizePatch(entity, input);
  const now = new Date().toISOString();

  if (entity === 'section') {
    const values: Record<string, unknown> = { id, version_id: versionId, ...normalized };
    const keys = Object.keys(values);
    db.prepare(`INSERT INTO assessment_sections (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
      .run(...keys.map((key) => values[key]));
  } else if (entity === 'question') {
    if (!input.sectionId) throw new Error('sectionId is required for a question.');
    const values: Record<string, unknown> = {
      id,
      version_id: versionId,
      section_id: String(input.sectionId),
      created_at: now,
      updated_at: now,
      ...normalized,
    };
    const keys = Object.keys(values);
    db.prepare(`INSERT INTO assessment_questions (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
      .run(...keys.map((key) => values[key]));
  } else {
    const values: Record<string, unknown> = { id, version_id: versionId, ...normalized };
    const keys = Object.keys(values);
    db.prepare(`INSERT INTO ${definition.table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
      .run(...keys.map((key) => values[key]));
  }

  adminAudit('admin.config.created', 'iso27001_' + entity, id, undefined, input);
  return { id, entity };
}

export function deleteIsoAdminEntity(entity: EntityName, id: string) {
  const db = getDatabase();
  const definition = ENTITY[entity];
  if (!definition) throw new Error('Unsupported ISO admin entity.');
  if (entity === 'section') throw new Error('Sections cannot be deleted while questions may reference them; reorder or rename them instead.');
  assertEditableEntity(entity, id);
  const before = db.prepare(`SELECT * FROM ${definition.table} WHERE id = ?`).get(id);

  if (['question','control','response_option','maturity_level','report_template'].includes(entity)) {
    db.prepare(`UPDATE ${definition.table} SET status = 'inactive' WHERE id = ?`).run(id);
  } else if (['scoring_rule','gate','evidence_status','gap_rule','roadmap_rule','recommendation_rule','service_mapping','ai_provider'].includes(entity)) {
    const activeColumn = entity === 'ai_provider' ? 'is_enabled' : 'is_active';
    db.prepare(`UPDATE ${definition.table} SET ${activeColumn} = 0 WHERE id = ?`).run(id);
  }
  adminAudit('admin.config.deactivated', 'iso27001_' + entity, id, before, undefined);
  return { id, entity, deactivated: true };
}

function cloneRows(
  table: string,
  sourceVersionId: string,
  targetVersionId: string,
  columns: string[],
  transforms?: (row: Record<string, unknown>) => Record<string, unknown>,
) {
  const db = getDatabase();
  const rows = db.prepare(`SELECT * FROM ${table} WHERE version_id = ?`).all(sourceVersionId) as Record<string, unknown>[];
  for (const original of rows) {
    const transformed = transforms ? transforms(original) : original;
    const values: Record<string, unknown> = { ...transformed, id: crypto.randomUUID(), version_id: targetVersionId };
    const selected = ['id','version_id',...columns].filter((key, index, arr) => arr.indexOf(key) === index);
    db.prepare(`INSERT INTO ${table} (${selected.join(',')}) VALUES (${selected.map(() => '?').join(',')})`)
      .run(...selected.map((key) => values[key] ?? null));
  }
}

export function cloneIsoVersion(sourceVersionId: string, newVersion: string) {
  const db = getDatabase();
  const source = db.prepare('SELECT * FROM assessment_versions WHERE id = ?').get(sourceVersionId) as Record<string, unknown> | undefined;
  if (!source) throw new Error('Source version not found.');

  const version = cleanVersion(newVersion);
  if (!version) throw new Error('New version label is required.');

  const targetVersionId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare(`
      INSERT INTO assessment_versions (id,template_id,version,status,published_at,created_at,updated_at)
      VALUES (?,?,?,'Draft',NULL,?,?)
    `).run(targetVersionId, source.template_id, version, now, now);

    const sectionRows = db.prepare('SELECT * FROM assessment_sections WHERE version_id = ? ORDER BY sort_order').all(sourceVersionId) as Record<string, unknown>[];
    const sectionMap = new Map<string, string>();
    for (const row of sectionRows) {
      const newId = crypto.randomUUID();
      sectionMap.set(String(row.id), newId);
      db.prepare(`
        INSERT INTO assessment_sections (id,version_id,code,title,domain,sort_order,is_quick)
        VALUES (?,?,?,?,?,?,?)
      `).run(newId,targetVersionId,row.code,row.title,row.domain,row.sort_order,row.is_quick);
    }

    const questionRows = db.prepare('SELECT * FROM assessment_questions WHERE version_id = ? ORDER BY sort_order').all(sourceVersionId) as Record<string, unknown>[];
    const questionMap = new Map<string, string>();
    for (const row of questionRows) {
      const newId = crypto.randomUUID();
      questionMap.set(String(row.id), newId);
      db.prepare(`
        INSERT INTO assessment_questions (
          id,version_id,section_id,question_code,clause_ref,domain,question_text,purpose,expected_evidence,
          risk_if_missing,recommendation,criticality,weight,gate_key,is_quick,applicability_rule,sort_order,
          status,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        newId,targetVersionId,sectionMap.get(String(row.section_id)),row.question_code,row.clause_ref,row.domain,
        row.question_text,row.purpose,row.expected_evidence,row.risk_if_missing,row.recommendation,row.criticality,
        row.weight,row.gate_key,row.is_quick,row.applicability_rule,row.sort_order,row.status,now,now
      );
    }

    cloneRows('response_options', sourceVersionId, targetVersionId, ['value','label','description','score','is_na','sort_order','status']);
    cloneRows('annex_controls', sourceVersionId, targetVersionId, ['control_ref','domain','title','question_text','purpose','expected_evidence','risk_if_missing','recommendation','criticality','weight','sort_order','status']);
    cloneRows('maturity_levels', sourceVersionId, targetVersionId, ['label','min_score','max_score','sort_order','status']);
    cloneRows('scoring_rules', sourceVersionId, targetVersionId, ['rule_key','label','weight','config_json','is_active']);
    cloneRows('evidence_status_rules', sourceVersionId, targetVersionId, ['status_key','label','score_percent','sort_order','is_active']);
    cloneRows('gap_severity_rules', sourceVersionId, targetVersionId, ['criticality','maximum_response','severity','sort_order','is_active']);
    cloneRows('roadmap_phase_rules', sourceVersionId, targetVersionId, ['severity','phase','priority','is_active']);
    cloneRows('recommendation_rules', sourceVersionId, targetVersionId, ['match_key','severity','recommendation','service_code','is_active']);
    cloneRows('report_templates', sourceVersionId, targetVersionId, ['name','header_text','footer_text','disclaimer_text','status']);
    cloneRows('service_mappings', sourceVersionId, targetVersionId, ['match_key','service_name','cta_parameter_key','is_active']);

    const gates = db.prepare('SELECT * FROM readiness_gates WHERE version_id = ? ORDER BY sort_order').all(sourceVersionId) as Record<string, unknown>[];
    for (const row of gates) {
      db.prepare(`
        INSERT INTO readiness_gates (
          id,version_id,gate_key,label,question_id,minimum_response,evidence_required,sort_order,is_active
        ) VALUES (?,?,?,?,?,?,?,?,?)
      `).run(
        crypto.randomUUID(),targetVersionId,row.gate_key,row.label,
        questionMap.get(String(row.question_id)),row.minimum_response,row.evidence_required,row.sort_order,row.is_active
      );
    }

    db.exec('COMMIT;');
    adminAudit('admin.version.cloned', 'iso27001_version', targetVersionId, { sourceVersionId }, { version, status: 'Draft' });
    return { versionId: targetVersionId, version, status: 'Draft' };
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

export function changeIsoVersionStatus(versionId: string, status: 'Draft' | 'Review' | 'Published' | 'Archived') {
  const db = getDatabase();
  const now = new Date().toISOString();
  const row = db.prepare('SELECT template_id FROM assessment_versions WHERE id = ?').get(versionId) as { template_id?: string } | undefined;
  if (!row?.template_id) throw new Error('Assessment version not found.');

  if (status === 'Published') {
    const controlCount = Number((db.prepare("SELECT COUNT(*) AS c FROM annex_controls WHERE version_id = ? AND status = 'active'").get(versionId) as { c: number }).c);
    const quickCount = Number((db.prepare("SELECT COUNT(*) AS c FROM assessment_questions WHERE version_id = ? AND status = 'active' AND is_quick = 1").get(versionId) as { c: number }).c);
    const optionCount = Number((db.prepare("SELECT COUNT(*) AS c FROM response_options WHERE version_id = ? AND status = 'active'").get(versionId) as { c: number }).c);
    const activeScoring = Number((db.prepare("SELECT COUNT(*) AS c FROM scoring_rules WHERE version_id = ? AND is_active = 1 AND rule_key IN ('requirement_readiness','control_readiness','evidence_readiness','governance_readiness','audit_readiness')").get(versionId) as { c: number }).c);

    if (controlCount !== 93) throw new Error(`Cannot publish: Annex A requires exactly 93 active controls; found ${controlCount}.`);
    if (quickCount < 25 || quickCount > 40) throw new Error(`Cannot publish: Quick Scan must contain 25–40 active questions; found ${quickCount}.`);
    if (optionCount < 7) throw new Error('Cannot publish: response scale 0–5 plus Not Applicable is incomplete.');
    if (activeScoring < 5) throw new Error('Cannot publish: deterministic scoring rules are incomplete.');
  }

  db.exec('BEGIN IMMEDIATE;');
  try {
    if (status === 'Published') {
      db.prepare(`
        UPDATE assessment_versions SET status = 'Archived', updated_at = ?
        WHERE template_id = ? AND status = 'Published' AND id <> ?
      `).run(now, row.template_id, versionId);
    }

    db.prepare(`
      UPDATE assessment_versions
      SET status = ?, published_at = CASE WHEN ? = 'Published' THEN ? ELSE published_at END,
          updated_at = ?
      WHERE id = ?
    `).run(status, status, now, now, versionId);

    db.exec('COMMIT;');
    adminAudit('admin.version.status_changed', 'iso27001_version', versionId, undefined, { status });
    return { versionId, status };
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

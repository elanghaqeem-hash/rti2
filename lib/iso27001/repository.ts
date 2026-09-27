import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '@/lib/server/database';

export type IsoMode = 'quick' | 'full';

export type IsoProfileInput = {
  name: string;
  industry?: string;
  subIndustry?: string;
  country?: string;
  employeeCount?: number | null;
  locationCount?: number | null;
  businessUnitCount?: number | null;
  itUserCount?: number | null;
  cloudStatus?: string;
  cloudProvider?: string;
  dataCenter?: string;
  remoteWorking?: boolean;
  outsourcedIt?: boolean;
  criticalThirdParties?: string;
  regulatoryEnvironment?: string;
  processesPersonalData?: boolean;
  hasSoc?: boolean;
  hasIncidentResponseTeam?: boolean;
  hasBcpDrp?: boolean;
  iso27001Certified?: boolean;
  targetCertification?: string;
  targetCertificationDate?: string;
};

export type CreateAssessmentInput = {
  mode: IsoMode;
  profile: IsoProfileInput;
  scope?: Record<string, unknown>;
  assessmentConsent: boolean;
  evidenceProcessingConsent?: boolean;
  aiProcessingConsent?: boolean;
};

export type SaveResponseInput = {
  targetRef: string;
  responseValue?: number | null;
  isNA?: boolean;
  applicabilityJustification?: string;
  evidenceStatus?: string;
  evidenceNote?: string;
  comment?: string;
  assessorNote?: string;
};

type TargetRow = {
  id: string;
  ref: string;
  domain: string;
  clauseRef: string;
  questionText: string;
  expectedEvidence: string | null;
  riskIfMissing: string | null;
  recommendation: string | null;
  criticality: 'Critical' | 'High' | 'Medium' | 'Low';
  weight: number;
  gateKey?: string | null;
  applicabilityRule?: string | null;
  kind: 'question' | 'control';
};

type ResponseRow = {
  target_ref: string;
  response_value: number | null;
  is_na: number;
  applicability_justification: string | null;
  evidence_status: string;
  evidence_note: string | null;
  comment: string | null;
  assessor_note: string | null;
};

function now() {
  return new Date().toISOString();
}

function cleanText(value: unknown, max = 1000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function nullableInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createAssessmentAccessToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function getPublishedVersion() {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT
      v.id AS version_id,
      v.version,
      t.id AS template_id,
      t.name,
      t.standard_version
    FROM assessment_versions v
    JOIN assessment_templates t ON t.id = v.template_id
    WHERE t.slug = 'iso27001-readiness' AND v.status = 'Published'
    ORDER BY COALESCE(v.published_at, v.created_at) DESC
    LIMIT 1
  `).get() as {
    version_id: string;
    version: string;
    template_id: string;
    name: string;
    standard_version: string;
  } | undefined;

  if (!row) {
    throw new Error('ISO 27001 readiness framework has not been published.');
  }
  return row;
}

function settingMap() {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT value, label
    FROM system_parameters
    WHERE group_key = 'iso27001.scalar' AND is_active = 1
    ORDER BY sort_order, value
  `).all() as Array<{ value: string; label: string }>;

  return Object.fromEntries(rows.map((row) => [row.value, row.label]));
}

export function getIsoTemplate(mode: IsoMode) {
  const db = getDatabase();
  const version = getPublishedVersion();

  const sections = db.prepare(`
    SELECT id, code, title, domain, sort_order AS sortOrder, is_quick AS isQuick
    FROM assessment_sections
    WHERE version_id = ?
    ORDER BY sort_order, code
  `).all(version.version_id);

  const questions = db.prepare(`
    SELECT
      q.id,
      q.question_code AS questionCode,
      q.clause_ref AS clauseRef,
      q.domain,
      q.question_text AS questionText,
      q.purpose,
      q.expected_evidence AS expectedEvidence,
      q.risk_if_missing AS riskIfMissing,
      q.recommendation,
      q.criticality,
      q.weight,
      q.gate_key AS gateKey,
      q.is_quick AS isQuick,
      q.applicability_rule AS applicabilityRule,
      q.sort_order AS sortOrder,
      s.code AS sectionCode,
      s.title AS sectionTitle
    FROM assessment_questions q
    JOIN assessment_sections s ON s.id = q.section_id
    WHERE q.version_id = ? AND q.status = 'active'
      AND (? = 'full' OR q.is_quick = 1)
    ORDER BY q.sort_order, q.question_code
  `).all(version.version_id, mode);

  const annexControls = mode === 'full'
    ? db.prepare(`
        SELECT
          id,
          control_ref AS controlRef,
          domain,
          title,
          question_text AS questionText,
          purpose,
          expected_evidence AS expectedEvidence,
          risk_if_missing AS riskIfMissing,
          recommendation,
          criticality,
          weight,
          sort_order AS sortOrder
        FROM annex_controls
        WHERE version_id = ? AND status = 'active'
        ORDER BY sort_order, control_ref
      `).all(version.version_id)
    : [];

  const responseOptions = db.prepare(`
    SELECT
      value, label, description, score, is_na AS isNA, sort_order AS sortOrder
    FROM response_options
    WHERE version_id = ? AND status = 'active'
    ORDER BY sort_order
  `).all(version.version_id);

  const evidenceStatuses = db.prepare(`
    SELECT
      status_key AS value, label, score_percent AS scorePercent, sort_order AS sortOrder
    FROM evidence_status_rules
    WHERE version_id = ? AND is_active = 1
    ORDER BY sort_order
  `).all(version.version_id);

  const maturityLevels = db.prepare(`
    SELECT label, min_score AS minScore, max_score AS maxScore, sort_order AS sortOrder
    FROM maturity_levels
    WHERE version_id = ? AND status = 'active'
    ORDER BY sort_order
  `).all(version.version_id);

  const gates = db.prepare(`
    SELECT gate_key AS gateKey, label, question_id AS questionId,
      minimum_response AS minimumResponse,
      evidence_required AS evidenceRequired,
      sort_order AS sortOrder
    FROM readiness_gates
    WHERE version_id = ? AND is_active = 1
    ORDER BY sort_order
  `).all(version.version_id);

  return {
    template: {
      id: version.template_id,
      name: version.name,
      standardVersion: version.standard_version,
      frameworkVersion: version.version,
      versionId: version.version_id,
      mode,
    },
    sections,
    questions,
    annexControls,
    responseOptions,
    evidenceStatuses,
    maturityLevels,
    gates,
    settings: settingMap(),
    copyright:
      'RTI diagnostic questions are interpretive and paraphrased. Licensed ISO text is not reproduced by this tool.',
  };
}

function audit(
  assessmentId: string,
  organizationId: string,
  action: string,
  objectType: string,
  objectId?: string | null,
  oldValue?: unknown,
  newValue?: unknown,
  actorType = 'public-user',
) {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO audit_logs
      (id, organization_id, assessment_id, actor_type, actor_id, action, object_type, object_id, old_value, new_value, created_at)
    VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    organizationId,
    assessmentId,
    actorType,
    action,
    objectType,
    objectId || null,
    oldValue === undefined ? null : JSON.stringify(oldValue),
    newValue === undefined ? null : JSON.stringify(newValue),
    now(),
  );
}

export function createIsoAssessment(input: CreateAssessmentInput) {
  const db = getDatabase();
  const version = getPublishedVersion();

  const name = cleanText(input.profile?.name, 240);
  if (!name) throw new Error('Organization name is required.');
  if (!input.assessmentConsent) throw new Error('Assessment consent is required.');

  const assessmentId = crypto.randomUUID();
  const organizationId = crypto.randomUUID();
  const token = createAssessmentAccessToken();
  const createdAt = now();

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare(`
      INSERT INTO organizations (
        id,name,industry,sub_industry,country,employee_count,location_count,business_unit_count,it_user_count,
        cloud_status,cloud_provider,data_center,remote_working,outsourced_it,critical_third_parties,
        regulatory_environment,processes_personal_data,has_soc,has_incident_response_team,has_bcp_drp,
        iso27001_certified,target_certification,target_certification_date,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      organizationId,
      name,
      cleanText(input.profile.industry, 160) || null,
      cleanText(input.profile.subIndustry, 160) || null,
      cleanText(input.profile.country, 120) || null,
      nullableInt(input.profile.employeeCount),
      nullableInt(input.profile.locationCount),
      nullableInt(input.profile.businessUnitCount),
      nullableInt(input.profile.itUserCount),
      cleanText(input.profile.cloudStatus, 80) || null,
      cleanText(input.profile.cloudProvider, 160) || null,
      cleanText(input.profile.dataCenter, 240) || null,
      input.profile.remoteWorking ? 1 : 0,
      input.profile.outsourcedIt ? 1 : 0,
      cleanText(input.profile.criticalThirdParties, 1200) || null,
      cleanText(input.profile.regulatoryEnvironment, 1200) || null,
      input.profile.processesPersonalData ? 1 : 0,
      input.profile.hasSoc ? 1 : 0,
      input.profile.hasIncidentResponseTeam ? 1 : 0,
      input.profile.hasBcpDrp ? 1 : 0,
      input.profile.iso27001Certified ? 1 : 0,
      cleanText(input.profile.targetCertification, 120) || null,
      cleanText(input.profile.targetCertificationDate, 40) || null,
      createdAt,
      createdAt,
    );

    db.prepare(`
      INSERT INTO assessments (
        id,template_id,version_id,organization_id,mode,status,access_token_hash,scope_json,
        assessment_consent,evidence_processing_consent,ai_processing_consent,created_at,updated_at
      ) VALUES (?,?,?,?,?,'in_progress',?,?,?,?,?,?,?)
    `).run(
      assessmentId,
      version.template_id,
      version.version_id,
      organizationId,
      input.mode === 'full' ? 'full' : 'quick',
      hashToken(token),
      JSON.stringify(input.scope || {}),
      input.assessmentConsent ? 1 : 0,
      input.evidenceProcessingConsent ? 1 : 0,
      input.aiProcessingConsent ? 1 : 0,
      createdAt,
      createdAt,
    );

    audit(
      assessmentId,
      organizationId,
      'assessment.created',
      'assessment',
      assessmentId,
      undefined,
      { mode: input.mode, frameworkVersion: version.version },
    );
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  return {
    id: assessmentId,
    accessToken: token,
    organizationId,
    frameworkVersion: version.version,
    mode: input.mode === 'full' ? 'full' : 'quick',
    createdAt,
  };
}

function authAssessment(id: string, token: string) {
  const db = getDatabase();
  const normalizedToken = cleanText(token, 500);
  if (!normalizedToken) throw new Error('Assessment access token is required.');

  const row = db.prepare(`
    SELECT
      a.*,
      o.name AS organization_name,
      o.industry,
      o.sub_industry,
      o.country,
      o.employee_count,
      o.location_count,
      o.business_unit_count,
      o.it_user_count,
      o.cloud_status,
      o.cloud_provider,
      o.data_center,
      o.remote_working,
      o.outsourced_it,
      o.critical_third_parties,
      o.regulatory_environment,
      o.processes_personal_data,
      o.has_soc,
      o.has_incident_response_team,
      o.has_bcp_drp,
      o.iso27001_certified,
      o.target_certification,
      o.target_certification_date,
      v.version AS framework_version
    FROM assessments a
    JOIN organizations o ON o.id = a.organization_id
    JOIN assessment_versions v ON v.id = a.version_id
    WHERE a.id = ? AND a.access_token_hash = ?
  `).get(id, hashToken(normalizedToken)) as Record<string, unknown> | undefined;

  if (!row) throw new Error('Assessment not found or access token is invalid.');
  return row;
}

export function getIsoAssessment(id: string, token: string) {
  const db = getDatabase();
  const assessment = authAssessment(id, token);
  const responses = db.prepare(`
    SELECT target_ref AS targetRef, response_value AS responseValue, is_na AS isNA,
      applicability_justification AS applicabilityJustification,
      evidence_status AS evidenceStatus, evidence_note AS evidenceNote,
      comment, assessor_note AS assessorNote, updated_at AS updatedAt
    FROM assessment_responses
    WHERE assessment_id = ?
    ORDER BY updated_at
  `).all(id);

  const evidence = db.prepare(`
    SELECT id, target_ref AS targetRef, original_name AS originalName, mime_type AS mimeType,
      size_bytes AS sizeBytes, classification, retention_until AS retentionUntil,
      scan_status AS scanStatus, created_at AS createdAt
    FROM evidence_files
    WHERE assessment_id = ?
    ORDER BY created_at DESC
  `).all(id);

  return { assessment, responses, evidence };
}

export function patchIsoAssessment(
  id: string,
  token: string,
  patch: { scope?: Record<string, unknown>; status?: 'in_progress' | 'submitted' },
) {
  const db = getDatabase();
  const current = authAssessment(id, token);
  const updatedAt = now();

  if (patch.scope) {
    db.prepare('UPDATE assessments SET scope_json = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(patch.scope), updatedAt, id);
  }

  if (patch.status) {
    db.prepare(`
      UPDATE assessments
      SET status = ?, submitted_at = CASE WHEN ? = 'submitted' THEN ? ELSE submitted_at END, updated_at = ?
      WHERE id = ?
    `).run(patch.status, patch.status, updatedAt, updatedAt, id);
  }

  audit(
    id,
    String(current.organization_id),
    'assessment.updated',
    'assessment',
    id,
    undefined,
    patch,
  );
  return getIsoAssessment(id, token);
}

function resolveTarget(versionId: string, targetRef: string): {
  kind: 'question' | 'control';
  id: string;
} {
  const db = getDatabase();
  const question = db.prepare(
    'SELECT id FROM assessment_questions WHERE version_id = ? AND id = ? AND status = \'active\'',
  ).get(versionId, targetRef) as { id: string } | undefined;
  if (question) return { kind: 'question', id: question.id };

  const control = db.prepare(
    'SELECT id FROM annex_controls WHERE version_id = ? AND id = ? AND status = \'active\'',
  ).get(versionId, targetRef) as { id: string } | undefined;
  if (control) return { kind: 'control', id: control.id };

  throw new Error('Assessment target is not part of the active framework version.');
}

export function saveIsoResponse(
  assessmentId: string,
  token: string,
  input: SaveResponseInput,
) {
  const db = getDatabase();
  const assessment = authAssessment(assessmentId, token);
  const targetRef = cleanText(input.targetRef, 120);
  const target = resolveTarget(String(assessment.version_id), targetRef);
  const isNA = input.isNA === true;
  const justification = cleanText(input.applicabilityJustification, 2000);
  const value = input.responseValue == null ? null : Number(input.responseValue);

  if (isNA && justification.length < 8) {
    throw new Error('Not Applicable requires a documented applicability justification.');
  }
  if (!isNA && (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 5)) {
    throw new Error('Response value must be an integer from 0 to 5.');
  }

  const evidenceStatuses = db.prepare(`
    SELECT status_key FROM evidence_status_rules
    WHERE version_id = ? AND is_active = 1
  `).all(String(assessment.version_id)) as Array<{ status_key: string }>;
  const allowedEvidence = new Set(evidenceStatuses.map((row) => row.status_key));
  const evidenceStatus = cleanText(input.evidenceStatus, 120) || 'no_evidence';
  if (!allowedEvidence.has(evidenceStatus)) {
    throw new Error('Invalid evidence status.');
  }

  const responseId = crypto.randomUUID();
  const updatedAt = now();
  const existing = db.prepare(
    'SELECT * FROM assessment_responses WHERE assessment_id = ? AND target_ref = ?',
  ).get(assessmentId, targetRef) as Record<string, unknown> | undefined;

  db.prepare(`
    INSERT INTO assessment_responses (
      id,assessment_id,target_ref,question_id,annex_control_id,response_value,is_na,
      applicability_justification,evidence_status,evidence_note,comment,assessor_note,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(assessment_id,target_ref) DO UPDATE SET
      response_value = excluded.response_value,
      is_na = excluded.is_na,
      applicability_justification = excluded.applicability_justification,
      evidence_status = excluded.evidence_status,
      evidence_note = excluded.evidence_note,
      comment = excluded.comment,
      assessor_note = excluded.assessor_note,
      updated_at = excluded.updated_at
  `).run(
    responseId,
    assessmentId,
    targetRef,
    target.kind === 'question' ? target.id : null,
    target.kind === 'control' ? target.id : null,
    isNA ? null : value,
    isNA ? 1 : 0,
    justification || null,
    evidenceStatus,
    cleanText(input.evidenceNote, 3000) || null,
    cleanText(input.comment, 3000) || null,
    cleanText(input.assessorNote, 3000) || null,
    updatedAt,
  );

  db.prepare('UPDATE assessments SET updated_at = ? WHERE id = ?').run(updatedAt, assessmentId);
  audit(
    assessmentId,
    String(assessment.organization_id),
    existing ? 'response.changed' : 'response.created',
    'assessment_response',
    targetRef,
    existing || undefined,
    {
      responseValue: isNA ? null : value,
      isNA,
      applicabilityJustification: justification || null,
      evidenceStatus,
    },
  );

  return {
    targetRef,
    responseValue: isNA ? null : value,
    isNA,
    applicabilityJustification: justification || null,
    evidenceStatus,
    updatedAt,
  };
}

function targetApplies(target: TargetRow, assessment: Record<string, unknown>) {
  if (!target.applicabilityRule) return true;
  try {
    const rule = JSON.parse(target.applicabilityRule) as {
      field?: string;
      equals?: unknown;
      notEquals?: unknown;
      notEmpty?: boolean;
    };
    if (!rule.field) return true;

    const fieldMap: Record<string, string> = {
      cloudStatus: 'cloud_status',
      cloudProvider: 'cloud_provider',
      remoteWorking: 'remote_working',
      outsourcedIt: 'outsourced_it',
      processesPersonalData: 'processes_personal_data',
      hasSoc: 'has_soc',
      hasIncidentResponseTeam: 'has_incident_response_team',
      hasBcpDrp: 'has_bcp_drp',
      iso27001Certified: 'iso27001_certified',
    };
    const databaseField = fieldMap[rule.field] || rule.field;
    let value = assessment[databaseField];

    if (['remoteWorking','outsourcedIt','processesPersonalData','hasSoc','hasIncidentResponseTeam','hasBcpDrp','iso27001Certified'].includes(rule.field)) {
      value = Number(value) === 1;
    }

    if (rule.notEmpty) return String(value ?? '').trim().length > 0;
    if (Object.prototype.hasOwnProperty.call(rule, 'equals')) return value === rule.equals;
    if (Object.prototype.hasOwnProperty.call(rule, 'notEquals')) return value !== rule.notEquals;
    return true;
  } catch {
    return true;
  }
}

function targetRows(versionId: string, mode: IsoMode, assessment: Record<string, unknown>): TargetRow[] {
  const db = getDatabase();
  const questions = db.prepare(`
    SELECT id,
      COALESCE(clause_ref, '') AS ref,
      domain,
      COALESCE(clause_ref, '') AS clauseRef,
      question_text AS questionText,
      expected_evidence AS expectedEvidence,
      risk_if_missing AS riskIfMissing,
      recommendation,
      criticality,
      weight,
      gate_key AS gateKey,
      applicability_rule AS applicabilityRule
    FROM assessment_questions
    WHERE version_id = ? AND status = 'active'
      AND (? = 'full' OR is_quick = 1)
    ORDER BY sort_order
  `).all(versionId, mode) as Array<Omit<TargetRow, 'kind'>>;

  const result: TargetRow[] = questions.map((row) => ({ ...row, kind: 'question' }));

  if (mode === 'full') {
    const controls = db.prepare(`
      SELECT id,
        control_ref AS ref,
        domain,
        'Annex A' AS clauseRef,
        question_text AS questionText,
        expected_evidence AS expectedEvidence,
        risk_if_missing AS riskIfMissing,
        recommendation,
        criticality,
        weight,
        NULL AS gateKey,
        NULL AS applicabilityRule
      FROM annex_controls
      WHERE version_id = ? AND status = 'active'
      ORDER BY sort_order
    `).all(versionId) as Array<Omit<TargetRow, 'kind'>>;
    result.push(...controls.map((row) => ({ ...row, kind: 'control' as const })));
  }

  return result.filter((target) => targetApplies(target, assessment));
}

function weightedScore(targets: TargetRow[], responses: Map<string, ResponseRow>) {
  let weighted = 0;
  let max = 0;
  for (const target of targets) {
    const response = responses.get(target.id);
    const validNA =
      response?.is_na === 1 &&
      String(response.applicability_justification || '').trim().length >= 8;
    if (validNA) continue;

    max += Number(target.weight) * 5;
    const value = response?.response_value == null ? 0 : Number(response.response_value);
    weighted += Math.max(0, Math.min(5, value)) * Number(target.weight);
  }
  return max > 0 ? (weighted / max) * 100 : 0;
}

function evidenceScore(
  targets: TargetRow[],
  responses: Map<string, ResponseRow>,
  evidenceRules: Map<string, number>,
) {
  let total = 0;
  let count = 0;
  for (const target of targets) {
    const response = responses.get(target.id);
    const validNA =
      response?.is_na === 1 &&
      String(response.applicability_justification || '').trim().length >= 8;
    if (validNA) continue;
    count += 1;
    total += evidenceRules.get(response?.evidence_status || 'no_evidence') || 0;
  }
  return count > 0 ? total / count : 0;
}

function determineSeverity(
  versionId: string,
  criticality: string,
  responseValue: number,
): 'Critical' | 'High' | 'Medium' | 'Low' | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT severity
    FROM gap_severity_rules
    WHERE version_id = ? AND criticality = ? AND maximum_response >= ? AND is_active = 1
    ORDER BY maximum_response ASC, sort_order ASC
    LIMIT 1
  `).get(versionId, criticality, responseValue) as { severity?: 'Critical' | 'High' | 'Medium' | 'Low' } | undefined;

  return row?.severity || null;
}

function phaseForSeverity(versionId: string, severity: string) {
  const db = getDatabase();
  return db.prepare(`
    SELECT phase, priority
    FROM roadmap_phase_rules
    WHERE version_id = ? AND severity = ? AND is_active = 1
    LIMIT 1
  `).get(versionId, severity) as { phase: string; priority: number } | undefined;
}

export function calculateIsoAssessment(assessmentId: string, token: string) {
  const db = getDatabase();
  const assessment = authAssessment(assessmentId, token);
  const versionId = String(assessment.version_id);
  const mode = String(assessment.mode) === 'full' ? 'full' : 'quick';
  const targets = targetRows(versionId, mode, assessment);

  const responseRows = db.prepare(`
    SELECT target_ref, response_value, is_na, applicability_justification,
      evidence_status, evidence_note, comment, assessor_note
    FROM assessment_responses
    WHERE assessment_id = ?
  `).all(assessmentId) as ResponseRow[];
  const responses = new Map(responseRows.map((row) => [row.target_ref, row]));

  const evidenceRulesRows = db.prepare(`
    SELECT status_key, score_percent
    FROM evidence_status_rules
    WHERE version_id = ? AND is_active = 1
  `).all(versionId) as Array<{ status_key: string; score_percent: number }>;
  const evidenceRules = new Map(evidenceRulesRows.map((row) => [row.status_key, Number(row.score_percent)]));

  const requirementTargets = targets.filter(
    (t) => t.kind === 'question' && t.clauseRef !== 'Annex A',
  );
  const quickControlTargets = targets.filter(
    (t) => t.kind === 'question' && t.clauseRef === 'Annex A',
  );
  const fullControlTargets = targets.filter((t) => t.kind === 'control');
  const controlTargets = mode === 'full' ? fullControlTargets : quickControlTargets;

  const requirementReadiness = weightedScore(requirementTargets, responses);
  const controlReadiness = weightedScore(controlTargets, responses);
  const evidenceReadiness = evidenceScore(targets, responses, evidenceRules);
  const governanceReadiness = weightedScore(
    requirementTargets.filter((t) => ['Clause 4','Clause 5','Clause 6'].includes(t.clauseRef)),
    responses,
  );
  const auditReadiness = weightedScore(
    requirementTargets.filter((t) => ['Clause 9','Clause 10'].includes(t.clauseRef)),
    responses,
  );

  const dimensionMap = new Map<string, number>([
    ['requirement_readiness', requirementReadiness],
    ['control_readiness', controlReadiness],
    ['evidence_readiness', evidenceReadiness],
    ['governance_readiness', governanceReadiness],
    ['audit_readiness', auditReadiness],
  ]);

  const rules = db.prepare(`
    SELECT rule_key, weight
    FROM scoring_rules
    WHERE version_id = ? AND is_active = 1
  `).all(versionId) as Array<{ rule_key: string; weight: number }>;

  let totalWeight = 0;
  let totalScore = 0;
  for (const rule of rules) {
    const score = dimensionMap.get(rule.rule_key);
    if (score == null) continue;
    totalWeight += Number(rule.weight);
    totalScore += score * Number(rule.weight);
  }
  const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  const maturity = db.prepare(`
    SELECT label
    FROM maturity_levels
    WHERE version_id = ? AND status = 'active' AND ? >= min_score AND ? <= max_score
    ORDER BY sort_order
    LIMIT 1
  `).get(versionId, overallScore, overallScore) as { label?: string } | undefined;

  const gates = db.prepare(`
    SELECT gate_key, label, question_id, minimum_response, evidence_required
    FROM readiness_gates
    WHERE version_id = ? AND is_active = 1
    ORDER BY sort_order
  `).all(versionId) as Array<{
    gate_key: string;
    label: string;
    question_id: string;
    minimum_response: number;
    evidence_required: number;
  }>;

  const gateResults = gates.map((gate) => {
    const response = responses.get(gate.question_id);
    const evidencePercent = evidenceRules.get(response?.evidence_status || 'no_evidence') || 0;
    const complete =
      response?.is_na !== 1 &&
      Number(response?.response_value ?? -1) >= Number(gate.minimum_response) &&
      (gate.evidence_required !== 1 || evidencePercent >= 45);
    return {
      key: gate.gate_key,
      label: gate.label,
      complete,
    };
  });
  const gatesCompleted = gateResults.filter((gate) => gate.complete).length;

  const stage1Requirement = weightedScore(
    requirementTargets.filter((t) => ['Clause 4','Clause 5','Clause 6','Clause 7'].includes(t.clauseRef)),
    responses,
  );
  const stage2Requirement = weightedScore(
    requirementTargets.filter((t) => ['Clause 8','Clause 9','Clause 10'].includes(t.clauseRef)),
    responses,
  );
  const stage1GateScore = gateResults.slice(0, 5).length
    ? (gateResults.slice(0, 5).filter((gate) => gate.complete).length / gateResults.slice(0, 5).length) * 100
    : 0;
  const stage2GateScore = gateResults.slice(5, 10).length
    ? (gateResults.slice(5, 10).filter((gate) => gate.complete).length / gateResults.slice(5, 10).length) * 100
    : 0;

  const stageDimensionMap = new Map<string, number>([
    ['stage1_requirement', stage1Requirement],
    ['stage1_gates', stage1GateScore],
    ['stage2_requirement', stage2Requirement],
    ['stage2_controls', controlReadiness],
    ['stage2_evidence', evidenceReadiness],
    ['stage2_gates', stage2GateScore],
  ]);

  function stageIndicator(prefix: 'stage1_' | 'stage2_') {
    let weighted = 0;
    let weight = 0;
    for (const rule of rules.filter((item) => item.rule_key.startsWith(prefix))) {
      const score = stageDimensionMap.get(rule.rule_key);
      if (score == null) continue;
      weighted += score * Number(rule.weight);
      weight += Number(rule.weight);
    }
    return weight > 0 ? weighted / weight : 0;
  }

  const stage1Preparation = stageIndicator('stage1_');
  const stage2Preparation = stageIndicator('stage2_');

  const groupScores = (selector: (target: TargetRow) => string) => {
    const groups = new Map<string, TargetRow[]>();
    for (const target of targets) {
      const key = selector(target);
      const current = groups.get(key) || [];
      current.push(target);
      groups.set(key, current);
    }
    return [...groups.entries()].map(([name, rows]) => ({
      name,
      score: Math.round(weightedScore(rows, responses) * 10) / 10,
    }));
  };

  const clauseScores = groupScores((t) => t.kind === 'control' ? `Annex A - ${t.domain}` : t.clauseRef);
  const annexScores = groupScores((t) => t.clauseRef === 'Annex A' ? t.domain : 'ISMS Requirements')
    .filter((row) => row.name !== 'ISMS Requirements');

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare('DELETE FROM gap_register WHERE assessment_id = ? AND generated_by = \'rule-engine\'').run(assessmentId);
    db.prepare('DELETE FROM roadmap_items WHERE assessment_id = ?').run(assessmentId);

    const insertGap = db.prepare(`
      INSERT INTO gap_register (
        id,assessment_id,target_ref,clause_control,finding,current_condition,expected_condition,evidence,
        severity,risk,recommendation,status,generated_by,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,'Open','rule-engine',?,?)
    `);
    const insertRoadmap = db.prepare(`
      INSERT INTO roadmap_items (
        id,assessment_id,phase,workstream,action_text,priority,source_gap_id,status,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,'Planned',?,?)
    `);

    for (const target of targets) {
      const response = responses.get(target.id);
      const validNA =
        response?.is_na === 1 &&
        String(response.applicability_justification || '').trim().length >= 8;
      if (validNA) continue;

      const value = response?.response_value == null ? 0 : Number(response.response_value);
      if (value >= 4) continue;

      const severity = determineSeverity(versionId, target.criticality, value);
      if (!severity) continue;
      const gapId = crypto.randomUUID();
      const evidenceLabel = response?.evidence_status || 'no_evidence';
      const finding = response
        ? `Readiness response is ${value}/5 and evidence status is ${evidenceLabel}.`
        : 'No assessment response has been provided for this item.';
      const currentCondition = response?.comment || finding;
      const expectedCondition = target.expectedEvidence
        ? `Implementation supported by appropriate evidence: ${target.expectedEvidence}`
        : 'Implemented, documented and supported by appropriate operating evidence.';

      insertGap.run(
        gapId,
        assessmentId,
        target.id,
        target.ref,
        finding,
        currentCondition,
        expectedCondition,
        response?.evidence_note || evidenceLabel,
        severity,
        target.riskIfMissing || 'Unmanaged information security exposure.',
        target.recommendation || 'Define, implement and evidence a proportionate remediation action.',
        now(),
        now(),
      );

      const phase = phaseForSeverity(versionId, severity);
      if (phase) {
        insertRoadmap.run(
          crypto.randomUUID(),
          assessmentId,
          phase.phase,
          target.kind === 'control' ? target.domain : target.clauseRef,
          target.recommendation || 'Close the identified readiness gap and retain evidence.',
          phase.priority,
          gapId,
          now(),
          now(),
        );
      }
    }

    db.prepare(`
      UPDATE assessments
      SET overall_score = ?, requirement_score = ?, control_score = ?, evidence_score = ?,
          governance_score = ?, audit_score = ?, stage1_score = ?, stage2_score = ?,
          readiness_level = ?, gates_completed = ?, updated_at = ?
      WHERE id = ?
    `).run(
      overallScore,
      requirementReadiness,
      controlReadiness,
      evidenceReadiness,
      governanceReadiness,
      auditReadiness,
      stage1Preparation,
      stage2Preparation,
      maturity?.label || 'Unclassified',
      gatesCompleted,
      now(),
      assessmentId,
    );

    audit(
      assessmentId,
      String(assessment.organization_id),
      'score.recalculated',
      'assessment',
      assessmentId,
      undefined,
      {
        overallScore,
        readinessLevel: maturity?.label || 'Unclassified',
        gatesCompleted,
      },
    );

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  const gaps = getIsoGaps(assessmentId, token);
  const severityCounts = gaps.reduce<Record<string, number>>((acc, gap) => {
    const key = String(gap.severity);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    calculatedAt: now(),
    frameworkVersion: String(assessment.framework_version),
    mode,
    completion: {
      answered: responseRows.length,
      total: targets.length,
      percentage: targets.length > 0
        ? Math.round((responseRows.length / targets.length) * 100)
        : 0,
    },
    overallScore: Math.round(overallScore * 10) / 10,
    readinessLevel: maturity?.label || 'Unclassified',
    dimensions: {
      requirementReadiness: Math.round(requirementReadiness * 10) / 10,
      controlReadiness: Math.round(controlReadiness * 10) / 10,
      evidenceReadiness: Math.round(evidenceReadiness * 10) / 10,
      governanceReadiness: Math.round(governanceReadiness * 10) / 10,
      auditReadiness: Math.round(auditReadiness * 10) / 10,
    },
    stage1: {
      label: 'Stage 1 Preparation Indicator',
      score: Math.round(stage1Preparation * 10) / 10,
    },
    stage2: {
      label: 'Stage 2 Preparation Indicator',
      score: Math.round(stage2Preparation * 10) / 10,
    },
    gates: {
      completed: gatesCompleted,
      total: gateResults.length,
      items: gateResults,
    },
    clauseScores,
    annexScores,
    gaps: {
      total: gaps.length,
      counts: severityCounts,
    },
    disclaimer:
      settingMap().DISCLAIMER ||
      'This is an RTI readiness indicator and not an official ISO certification score.',
  };
}

export function getIsoGaps(assessmentId: string, token: string) {
  authAssessment(assessmentId, token);
  const db = getDatabase();
  return db.prepare(`
    SELECT id, target_ref AS targetRef, clause_control AS clauseControl, finding,
      current_condition AS currentCondition, expected_condition AS expectedCondition,
      evidence, severity, risk, recommendation, action_owner AS actionOwner,
      due_date AS dueDate, status, created_at AS createdAt, updated_at AS updatedAt
    FROM gap_register
    WHERE assessment_id = ?
    ORDER BY
      CASE severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
      created_at
  `).all(assessmentId) as Array<Record<string, unknown>>;
}

export function getIsoRoadmap(assessmentId: string, token: string) {
  authAssessment(assessmentId, token);
  const db = getDatabase();
  return db.prepare(`
    SELECT id, phase, workstream, action_text AS actionText, priority,
      source_gap_id AS sourceGapId, status, created_at AS createdAt, updated_at AS updatedAt
    FROM roadmap_items
    WHERE assessment_id = ?
    ORDER BY priority, created_at
  `).all(assessmentId) as Array<Record<string, unknown>>;
}

export function getIsoResults(assessmentId: string, token: string) {
  const db = getDatabase();
  const assessment = authAssessment(assessmentId, token);
  const gaps = getIsoGaps(assessmentId, token);
  const roadmap = getIsoRoadmap(assessmentId, token);

  const gates = db.prepare(`
    SELECT g.gate_key AS gateKey, g.label, g.question_id AS questionId,
      g.minimum_response AS minimumResponse, g.evidence_required AS evidenceRequired,
      r.response_value AS responseValue, r.evidence_status AS evidenceStatus
    FROM readiness_gates g
    LEFT JOIN assessment_responses r
      ON r.assessment_id = ? AND r.question_id = g.question_id
    WHERE g.version_id = ? AND g.is_active = 1
    ORDER BY g.sort_order
  `).all(assessmentId, String(assessment.version_id));

  const serviceMappings = db.prepare(`
    SELECT match_key AS matchKey, service_name AS serviceName, cta_parameter_key AS ctaParameterKey
    FROM service_mappings
    WHERE version_id = ? AND is_active = 1
    ORDER BY id
  `).all(String(assessment.version_id)) as Array<{
    matchKey: string;
    serviceName: string;
    ctaParameterKey: string | null;
  }>;

  const reportTemplate = db.prepare(`
    SELECT name, header_text AS headerText, footer_text AS footerText,
      disclaimer_text AS disclaimerText
    FROM report_templates
    WHERE version_id = ? AND status = 'active'
    ORDER BY id
    LIMIT 1
  `).get(String(assessment.version_id)) as
    | { name: string; headerText: string; footerText: string; disclaimerText: string }
    | undefined;

  const serviceRecommendations = serviceMappings
    .filter((mapping) =>
      gaps.some((gap) =>
        String(gap.severity) === mapping.matchKey ||
        String(gap.targetRef) === mapping.matchKey ||
        String(gap.clauseControl) === mapping.matchKey,
      ),
    )
    .filter((mapping, index, all) =>
      all.findIndex((item) => item.serviceName === mapping.serviceName) === index,
    );

  return {
    assessment: {
      id: assessmentId,
      mode: assessment.mode,
      status: assessment.status,
      organizationName: assessment.organization_name,
      frameworkVersion: assessment.framework_version,
      overallScore: assessment.overall_score,
      requirementScore: assessment.requirement_score,
      controlScore: assessment.control_score,
      evidenceScore: assessment.evidence_score,
      governanceScore: assessment.governance_score,
      auditScore: assessment.audit_score,
      stage1Score: assessment.stage1_score,
      stage2Score: assessment.stage2_score,
      readinessLevel: assessment.readiness_level,
      gatesCompleted: assessment.gates_completed,
      updatedAt: assessment.updated_at,
    },
    gates,
    gaps,
    roadmap,
    serviceRecommendations,
    reportTemplate: reportTemplate || null,
    settings: settingMap(),
  };
}

export function evidenceUploadDirectory() {
  const configured = cleanText(process.env.RTI_UPLOAD_DIR, 1000);
  if (configured) {
    const resolved = path.resolve(configured);
    fs.mkdirSync(resolved, { recursive: true });
    return resolved;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('RTI_UPLOAD_DIR must be configured before evidence upload is enabled in production.');
  }
  const fallback = path.join(process.cwd(), 'data', 'uploads');
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

export function recordEvidenceFile(
  assessmentId: string,
  token: string,
  input: {
    targetRef?: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    sizeBytes: number;
    classification?: string;
    retentionUntil?: string;
    uploaderLabel?: string;
  },
) {
  const db = getDatabase();
  const assessment = authAssessment(assessmentId, token);
  if (input.targetRef) resolveTarget(String(assessment.version_id), input.targetRef);

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO evidence_files (
      id,organization_id,assessment_id,target_ref,original_name,stored_name,mime_type,size_bytes,
      classification,retention_until,scan_status,uploader_label,created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?, 'pending', ?,?)
  `).run(
    id,
    String(assessment.organization_id),
    assessmentId,
    input.targetRef || null,
    cleanText(input.originalName, 255),
    cleanText(input.storedName, 255),
    cleanText(input.mimeType, 160),
    Math.max(0, Math.trunc(input.sizeBytes)),
    cleanText(input.classification, 80) || 'Confidential',
    cleanText(input.retentionUntil, 40) || null,
    cleanText(input.uploaderLabel, 160) || null,
    now(),
  );

  if (input.targetRef) {
    db.prepare(`
      UPDATE assessment_responses
      SET evidence_status = 'evidence_uploaded', updated_at = ?
      WHERE assessment_id = ? AND target_ref = ?
        AND evidence_status IN ('no_evidence','evidence_planned','evidence_exists')
    `).run(now(), assessmentId, input.targetRef);
  }

  audit(
    assessmentId,
    String(assessment.organization_id),
    'evidence.uploaded',
    'evidence_file',
    id,
    undefined,
    {
      targetRef: input.targetRef || null,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    },
  );

  return { id, scanStatus: 'pending' };
}


export function getIsoApplicabilityOptions() {
  const db = getDatabase();
  return db.prepare(`
    SELECT value, label, description, sort_order AS sortOrder
    FROM system_parameters
    WHERE group_key = 'iso27001.applicability' AND is_active = 1
    ORDER BY sort_order, label
  `).all();
}

export function getIsoSoa(assessmentId: string, token: string) {
  const db = getDatabase();
  const assessment = authAssessment(assessmentId, token);
  const versionId = String(assessment.version_id);

  return db.prepare(`
    SELECT
      c.id AS controlId,
      c.control_ref AS controlRef,
      c.domain,
      c.title,
      COALESCE(a.applicable, 1) AS applicable,
      a.justification,
      a.risk_reference AS riskReference,
      a.owner,
      r.response_value AS implementationStatus,
      r.evidence_status AS evidenceStatus,
      r.evidence_note AS evidenceNote
    FROM annex_controls c
    LEFT JOIN control_applicability a
      ON a.assessment_id = ? AND a.annex_control_id = c.id
    LEFT JOIN assessment_responses r
      ON r.assessment_id = ? AND r.annex_control_id = c.id
    WHERE c.version_id = ? AND c.status = 'active'
    ORDER BY c.sort_order, c.control_ref
  `).all(assessmentId, assessmentId, versionId);
}

export function saveIsoSoa(
  assessmentId: string,
  token: string,
  input: {
    controlId: string;
    applicable: boolean;
    justification?: string;
    riskReference?: string;
    owner?: string;
  },
) {
  const db = getDatabase();
  const assessment = authAssessment(assessmentId, token);
  const controlId = cleanText(input.controlId, 120);
  const target = resolveTarget(String(assessment.version_id), controlId);
  if (target.kind !== 'control') throw new Error('SoA item must reference an Annex A control.');

  const justification = cleanText(input.justification, 3000);
  if (!input.applicable && justification.length < 8) {
    throw new Error('A non-applicable control requires documented justification.');
  }

  const id = crypto.randomUUID();
  const timestamp = now();
  db.prepare(`
    INSERT INTO control_applicability
      (id,assessment_id,annex_control_id,applicable,justification,risk_reference,owner,updated_at)
    VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(assessment_id,annex_control_id) DO UPDATE SET
      applicable = excluded.applicable,
      justification = excluded.justification,
      risk_reference = excluded.risk_reference,
      owner = excluded.owner,
      updated_at = excluded.updated_at
  `).run(
    id,
    assessmentId,
    controlId,
    input.applicable ? 1 : 0,
    justification || (input.applicable ? 'Applicable based on current assessment scope and risk context.' : ''),
    cleanText(input.riskReference, 500) || null,
    cleanText(input.owner, 240) || null,
    timestamp,
  );

  audit(
    assessmentId,
    String(assessment.organization_id),
    'soa.updated',
    'control_applicability',
    controlId,
    undefined,
    {
      applicable: input.applicable,
      justification,
      riskReference: cleanText(input.riskReference, 500) || null,
      owner: cleanText(input.owner, 240) || null,
    },
  );

  return { controlId, applicable: input.applicable, updatedAt: timestamp };
}

export function listIsoRisks(assessmentId: string, token: string) {
  authAssessment(assessmentId, token);
  const db = getDatabase();
  return db.prepare(`
    SELECT id, asset_process AS assetProcess, threat, vulnerability, impact, likelihood,
      inherent_risk AS inherentRisk, controls, residual_risk AS residualRisk,
      risk_owner AS riskOwner, treatment, created_at AS createdAt, updated_at AS updatedAt
    FROM risks
    WHERE assessment_id = ?
    ORDER BY updated_at DESC
  `).all(assessmentId);
}

export function upsertIsoRisk(
  assessmentId: string,
  token: string,
  input: Record<string, unknown>,
) {
  const db = getDatabase();
  const assessment = authAssessment(assessmentId, token);
  const id = cleanText(input.id, 120) || crypto.randomUUID();
  const assetProcess = cleanText(input.assetProcess, 500);
  if (!assetProcess) throw new Error('Asset/process is required.');

  const impact = input.impact == null ? null : Math.max(1, Math.min(5, Math.trunc(Number(input.impact))));
  const likelihood = input.likelihood == null ? null : Math.max(1, Math.min(5, Math.trunc(Number(input.likelihood))));
  const inherentRisk =
    impact != null && likelihood != null
      ? impact * likelihood
      : input.inherentRisk == null
        ? null
        : Math.max(1, Math.min(25, Math.trunc(Number(input.inherentRisk))));
  const residualRisk =
    input.residualRisk == null
      ? null
      : Math.max(1, Math.min(25, Math.trunc(Number(input.residualRisk))));
  const timestamp = now();

  const existing = db.prepare('SELECT id FROM risks WHERE id = ? AND assessment_id = ?').get(id, assessmentId) as { id?: string } | undefined;

  if (existing?.id) {
    db.prepare(`
      UPDATE risks SET
        asset_process = ?, threat = ?, vulnerability = ?, impact = ?, likelihood = ?,
        inherent_risk = ?, controls = ?, residual_risk = ?, risk_owner = ?, treatment = ?, updated_at = ?
      WHERE id = ? AND assessment_id = ?
    `).run(
      assetProcess,
      cleanText(input.threat, 1000) || null,
      cleanText(input.vulnerability, 1000) || null,
      impact,
      likelihood,
      inherentRisk,
      cleanText(input.controls, 2000) || null,
      residualRisk,
      cleanText(input.riskOwner, 240) || null,
      cleanText(input.treatment, 2000) || null,
      timestamp,
      id,
      assessmentId,
    );
  } else {
    db.prepare(`
      INSERT INTO risks (
        id,assessment_id,asset_process,threat,vulnerability,impact,likelihood,inherent_risk,
        controls,residual_risk,risk_owner,treatment,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id,
      assessmentId,
      assetProcess,
      cleanText(input.threat, 1000) || null,
      cleanText(input.vulnerability, 1000) || null,
      impact,
      likelihood,
      inherentRisk,
      cleanText(input.controls, 2000) || null,
      residualRisk,
      cleanText(input.riskOwner, 240) || null,
      cleanText(input.treatment, 2000) || null,
      timestamp,
      timestamp,
    );
  }

  audit(
    assessmentId,
    String(assessment.organization_id),
    existing?.id ? 'risk.updated' : 'risk.created',
    'risk',
    id,
    undefined,
    { assetProcess, inherentRisk, residualRisk },
  );

  return { id, inherentRisk, residualRisk, updatedAt: timestamp };
}

export function deleteIsoRisk(assessmentId: string, token: string, riskId: string) {
  const db = getDatabase();
  const assessment = authAssessment(assessmentId, token);
  const result = db.prepare('DELETE FROM risks WHERE id = ? AND assessment_id = ?').run(riskId, assessmentId);
  if (Number(result.changes) < 1) throw new Error('Risk record not found.');
  audit(assessmentId, String(assessment.organization_id), 'risk.deleted', 'risk', riskId);
  return { id: riskId, deleted: true };
}

export function getIsoAiAnalysisContext(assessmentId: string, token: string, targetRef: string) {
  const db = getDatabase();
  const assessment = authAssessment(assessmentId, token);
  if (Number(assessment.ai_processing_consent) !== 1) {
    throw new Error('AI processing consent has not been granted for this assessment.');
  }

  const target = resolveTarget(String(assessment.version_id), targetRef);
  const metadata =
    target.kind === 'question'
      ? db.prepare(`
          SELECT question_text AS questionText, purpose, expected_evidence AS expectedEvidence,
            risk_if_missing AS riskIfMissing, recommendation, clause_ref AS reference, domain
          FROM assessment_questions WHERE id = ?
        `).get(target.id)
      : db.prepare(`
          SELECT question_text AS questionText, purpose, expected_evidence AS expectedEvidence,
            risk_if_missing AS riskIfMissing, recommendation, control_ref AS reference, domain
          FROM annex_controls WHERE id = ?
        `).get(target.id);

  const response = db.prepare(`
    SELECT response_value AS responseValue, is_na AS isNA,
      applicability_justification AS applicabilityJustification,
      evidence_status AS evidenceStatus, evidence_note AS evidenceNote, comment
    FROM assessment_responses
    WHERE assessment_id = ? AND target_ref = ?
  `).get(assessmentId, targetRef) as Record<string, unknown> | undefined;

  const files = db.prepare(`
    SELECT original_name AS originalName, mime_type AS mimeType, size_bytes AS sizeBytes,
      stored_name AS storedName, scan_status AS scanStatus
    FROM evidence_files
    WHERE assessment_id = ? AND target_ref = ?
    ORDER BY created_at DESC
  `).all(assessmentId, targetRef) as Array<Record<string, unknown>>;

  const textualExtracts: Array<{ file: string; text: string }> = [];
  for (const file of files) {
    if (file.mimeType !== 'text/plain') continue;
    try {
      const safeStoredName = path.basename(String(file.storedName || ''));
      if (!safeStoredName) continue;
      const filePath = path.join(evidenceUploadDirectory(), safeStoredName);
      const textValue = fs.readFileSync(filePath, 'utf8').slice(0, 20000);
      textualExtracts.push({ file: String(file.originalName || safeStoredName), text: textValue });
    } catch {
      // Evidence metadata remains available even when direct text extraction is unavailable.
    }
  }

  return {
    assessment: {
      id: assessmentId,
      organizationName: assessment.organization_name,
      frameworkVersion: assessment.framework_version,
      mode: assessment.mode,
    },
    target: metadata,
    response: response || null,
    evidenceFiles: files.map(({ storedName: _storedName, ...safe }) => safe),
    textualExtracts,
    limitations:
      'TXT evidence can be read directly. Binary PDF/Office/image content is not extracted by this server module unless a dedicated document parser is added; only metadata and user evidence notes are supplied for those files.',
  };
}

export function recordIsoAiAnalysis(
  assessmentId: string,
  token: string,
  targetRef: string,
  provider: string,
) {
  const assessment = authAssessment(assessmentId, token);
  audit(
    assessmentId,
    String(assessment.organization_id),
    'ai.analysis.requested',
    'iso27001_evidence',
    targetRef,
    undefined,
    { provider },
  );
}

export function deleteIsoAssessment(assessmentId: string, token: string) {
  const db = getDatabase();
  const assessment = authAssessment(assessmentId, token);
  const organizationId = String(assessment.organization_id);
  const files = db.prepare('SELECT stored_name FROM evidence_files WHERE assessment_id = ?').all(assessmentId) as Array<{ stored_name: string }>;

  for (const file of files) {
    try {
      const storedName = path.basename(String(file.stored_name || ''));
      if (storedName) fs.rmSync(path.join(evidenceUploadDirectory(), storedName), { force: true });
    } catch {
      // Continue database deletion even if a stale evidence file is already missing.
    }
  }

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare('DELETE FROM assessments WHERE id = ?').run(assessmentId);
    const remaining = db.prepare('SELECT COUNT(*) AS c FROM assessments WHERE organization_id = ?').get(organizationId) as { c: number };
    if (Number(remaining.c) === 0) {
      db.prepare('DELETE FROM organizations WHERE id = ?').run(organizationId);
    }
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  return { assessmentId, deleted: true };
}

export function deleteIsoEvidence(
  assessmentId: string,
  token: string,
  evidenceId: string,
) {
  const db = getDatabase();
  const assessment = authAssessment(assessmentId, token);
  const row = db.prepare(`
    SELECT id, stored_name FROM evidence_files WHERE id = ? AND assessment_id = ?
  `).get(evidenceId, assessmentId) as { id?: string; stored_name?: string } | undefined;
  if (!row?.id) throw new Error('Evidence file not found.');

  if (row.stored_name) {
    try {
      fs.rmSync(path.join(evidenceUploadDirectory(), path.basename(row.stored_name)), { force: true });
    } catch {
      // Database deletion is authoritative; stale storage can be cleaned by operations.
    }
  }
  db.prepare('DELETE FROM evidence_files WHERE id = ? AND assessment_id = ?').run(evidenceId, assessmentId);
  audit(assessmentId, String(assessment.organization_id), 'evidence.deleted', 'evidence_file', evidenceId);
  return { evidenceId, deleted: true };
}


export function getIsoAiProviderRuntimeConfig() {
  const db = getDatabase();
  const allowed = new Set(['anthropic','openai','gemini','groq','openrouter','deepseek']);
  return (db.prepare(`
    SELECT provider_key AS provider, model_name AS model
    FROM ai_provider_configuration
    WHERE is_enabled = 1
    ORDER BY priority, provider_key
  `).all() as Array<{ provider: string; model: string | null }>)
    .filter((row) => allowed.has(row.provider))
    .map((row) => ({
      provider: row.provider as 'anthropic' | 'openai' | 'gemini' | 'groq' | 'openrouter' | 'deepseek',
      model: row.model || undefined,
    }));
}

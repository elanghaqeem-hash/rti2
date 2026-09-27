import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/server/database';
import { ensurePdpSeeded, seedMetadata } from '@/lib/pdp/seed';
import type {
  PdpMode,
  PdpProfile,
  PdpQuestion,
  PdpResponseInput,
  PdpScoreResult,
} from '@/lib/pdp/types';

type QuestionRow = {
  id: string;
  code: string;
  domain_id: string;
  domain_code: string;
  domain_name: string;
  domain_weight: number;
  subdomain: string | null;
  question_text: string;
  question_help: string | null;
  regulation_reference: string | null;
  article_reference: string | null;
  control_objective: string | null;
  risk_statement: string | null;
  recommended_evidence: string | null;
  weight: number;
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
  answer_type: string;
  answer_options_json: string;
  profile_requirements_json: string;
  is_quick: number;
  sort_order: number;
};

function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function now() {
  return new Date().toISOString();
}

function normalizeQuestion(row: QuestionRow): PdpQuestion {
  return {
    id: row.id,
    code: row.code,
    domainId: row.domain_id,
    domainCode: row.domain_code,
    domainName: row.domain_name,
    subdomain: row.subdomain || undefined,
    questionText: row.question_text,
    questionHelp: row.question_help || undefined,
    regulationReference: row.regulation_reference || undefined,
    articleReference: row.article_reference || undefined,
    controlObjective: row.control_objective || undefined,
    riskStatement: row.risk_statement || undefined,
    recommendedEvidence: row.recommended_evidence || undefined,
    weight: Number(row.weight),
    domainWeight: Number(row.domain_weight),
    criticality: row.criticality,
    answerType: row.answer_type,
    answerOptions: safeJson<string[]>(row.answer_options_json, []),
    profileRequirements: safeJson<Record<string, boolean | string | number>>(
      row.profile_requirements_json,
      {},
    ),
    isQuick: Number(row.is_quick) === 1,
    sortOrder: Number(row.sort_order),
  };
}

function profileMatches(
  profile: PdpProfile,
  requirements: Record<string, unknown>,
): boolean {
  if (!requirements || Object.keys(requirements).length === 0) return true;

  const anyTrue = Array.isArray(requirements.anyTrue)
    ? requirements.anyTrue.map(String)
    : [];
  if (anyTrue.length > 0) {
    const source = profile as unknown as Record<string, unknown>;
    if (!anyTrue.some((key) => source[key] === true)) return false;
  }

  const source = profile as unknown as Record<string, unknown>;
  for (const [key, expected] of Object.entries(requirements)) {
    if (key === 'anyTrue') continue;
    if (source[key] !== expected) return false;
  }
  return true;
}

export function getPdpConfig() {
  ensurePdpSeeded();
  const db = getDatabase();
  const metadata = seedMetadata();

  const domains = db.prepare(
    `SELECT id, code, name, description, weight, sort_order
     FROM pdp_domains WHERE is_active = 1 ORDER BY sort_order, name`,
  ).all();

  const industries = db.prepare(
    `SELECT code AS value, label, description
     FROM pdp_industry_packs WHERE is_active = 1 ORDER BY sort_order, label`,
  ).all();

  const answers = db.prepare(
    `SELECT value, label, score, confidence_factor AS confidenceFactor
     FROM pdp_answer_options WHERE is_active = 1 ORDER BY sort_order`,
  ).all();

  return {
    metadata,
    domains,
    industries,
    answers,
    confidenceOptions: [
      { value: 'confirmed', label: 'Confirmed', factor: 1.0 },
      { value: 'partial', label: 'Partially Confirmed', factor: 0.85 },
      { value: 'unverified', label: 'Not Verified', factor: 0.7 },
    ],
    evidenceOptions: [
      { value: 'verified', label: 'Verified evidence', factor: 1.0 },
      { value: 'available', label: 'Evidence available', factor: 0.95 },
      { value: 'not_available', label: 'Evidence not available', factor: 0.8 },
      { value: 'not_required', label: 'Evidence not required', factor: 1.0 },
    ],
  };
}

export function listPdpQuestions(mode: PdpMode, profile: PdpProfile): PdpQuestion[] {
  ensurePdpSeeded();
  const db = getDatabase();
  const rows = db.prepare(
    `SELECT q.id, q.code, q.domain_id, d.code AS domain_code, d.name AS domain_name,
            d.weight AS domain_weight, q.subdomain, q.question_text, q.question_help,
            q.regulation_reference, q.article_reference, q.control_objective,
            q.risk_statement, q.recommended_evidence, q.weight, q.criticality,
            q.answer_type, q.answer_options_json, q.profile_requirements_json,
            q.is_quick, q.sort_order
     FROM pdp_questions q
     JOIN pdp_domains d ON d.id = q.domain_id
     WHERE q.status = 'active' AND d.is_active = 1
       AND (? = 'comprehensive' OR q.is_quick = 1)
     ORDER BY q.sort_order`,
  ).all(mode) as QuestionRow[];

  return rows
    .map(normalizeQuestion)
    .filter((question) => profileMatches(profile, question.profileRequirements));
}

export function createPdpAssessment(mode: PdpMode, profile: PdpProfile) {
  ensurePdpSeeded();
  const db = getDatabase();
  const assessmentId = randomUUID();
  const organizationId = randomUUID();
  const resumeToken = randomBytes(32).toString('base64url');
  const timestamp = now();

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare(
      `INSERT INTO organizations (
        id, name, industry, organization_size, employee_count, data_subject_count,
        customer_types_json, operating_regions_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      organizationId,
      profile.companyName || 'Guest Organization',
      profile.industry || null,
      profile.organizationSize || null,
      Number.isFinite(profile.employeeCount) ? profile.employeeCount : null,
      Number.isFinite(profile.dataSubjectCount) ? profile.dataSubjectCount : null,
      JSON.stringify(profile.customerTypes || []),
      JSON.stringify(profile.operatingRegions || []),
      timestamp,
      timestamp,
    );

    db.prepare(
      `INSERT INTO pdp_assessments (
        id, resume_token_hash, organization_id, mode, status, profile_json,
        question_set_version, regulation_version, scoring_model_version,
        assessment_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'in_progress', ?, '1.0', '2022', '1.0', ?, ?, ?)`,
    ).run(
      assessmentId,
      tokenHash(resumeToken),
      organizationId,
      mode,
      JSON.stringify(profile),
      timestamp,
      timestamp,
      timestamp,
    );

    db.prepare(
      `INSERT INTO pdp_audit_logs
        (assessment_id, actor_type, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, 'guest', 'assessment_created', 'assessment', ?, ?, ?)`,
    ).run(
      assessmentId,
      assessmentId,
      JSON.stringify({ mode }),
      timestamp,
    );

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  return {
    assessmentId,
    resumeToken,
    questions: listPdpQuestions(mode, profile),
    profile,
  };
}

export function verifyPdpAssessmentAccess(assessmentId: string, token: string) {
  ensurePdpSeeded();
  const db = getDatabase();
  const row = db.prepare(
    `SELECT id, resume_token_hash, mode, status, profile_json, result_json,
            question_set_version, regulation_version, scoring_model_version,
            assessment_date, completion_date
     FROM pdp_assessments WHERE id = ?`,
  ).get(assessmentId) as
    | {
        id: string;
        resume_token_hash: string;
        mode: PdpMode;
        status: string;
        profile_json: string;
        result_json: string | null;
        question_set_version: string;
        regulation_version: string;
        scoring_model_version: string;
        assessment_date: string;
        completion_date: string | null;
      }
    | undefined;

  if (!row || tokenHash(token) !== row.resume_token_hash) return null;

  return {
    id: row.id,
    mode: row.mode,
    status: row.status,
    profile: safeJson<PdpProfile>(row.profile_json, {} as PdpProfile),
    result: safeJson<PdpScoreResult | null>(row.result_json, null),
    questionSetVersion: row.question_set_version,
    regulationVersion: row.regulation_version,
    scoringModelVersion: row.scoring_model_version,
    assessmentDate: row.assessment_date,
    completionDate: row.completion_date,
  };
}

export function loadPdpAssessment(assessmentId: string, token: string) {
  const assessment = verifyPdpAssessmentAccess(assessmentId, token);
  if (!assessment) return null;
  const db = getDatabase();
  const responses = db.prepare(
    `SELECT question_id AS questionId, answer_value AS answerValue,
            numeric_value AS numericValue, text_value AS textValue,
            confidence, evidence_status AS evidenceStatus
     FROM pdp_responses WHERE assessment_id = ?`,
  ).all(assessmentId) as unknown as PdpResponseInput[];

  return {
    ...assessment,
    responses,
    questions: listPdpQuestions(assessment.mode, assessment.profile),
  };
}

export function savePdpResponses(
  assessmentId: string,
  token: string,
  responses: PdpResponseInput[],
) {
  const assessment = verifyPdpAssessmentAccess(assessmentId, token);
  if (!assessment) return false;
  const applicable = new Set(
    listPdpQuestions(assessment.mode, assessment.profile).map((question) => question.id),
  );
  const db = getDatabase();
  const timestamp = now();

  const statement = db.prepare(
    `INSERT INTO pdp_responses (
      assessment_id, question_id, answer_value, numeric_value, text_value,
      confidence, evidence_status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(assessment_id, question_id) DO UPDATE SET
      answer_value = excluded.answer_value,
      numeric_value = excluded.numeric_value,
      text_value = excluded.text_value,
      confidence = excluded.confidence,
      evidence_status = excluded.evidence_status,
      updated_at = excluded.updated_at`,
  );

  db.exec('BEGIN IMMEDIATE;');
  try {
    for (const response of responses) {
      if (!applicable.has(response.questionId)) continue;
      statement.run(
        assessmentId,
        response.questionId,
        response.answerValue || null,
        Number.isFinite(response.numericValue) ? response.numericValue : null,
        response.textValue?.slice(0, 4000) || null,
        response.confidence || 'unverified',
        response.evidenceStatus || 'not_available',
        timestamp,
      );
    }
    db.prepare(
      'UPDATE pdp_assessments SET updated_at = ? WHERE id = ?',
    ).run(timestamp, assessmentId);
    db.prepare(
      `INSERT INTO pdp_audit_logs
        (assessment_id, actor_type, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, 'guest', 'responses_saved', 'assessment', ?, ?, ?)`,
    ).run(
      assessmentId,
      assessmentId,
      JSON.stringify({ count: responses.length }),
      timestamp,
    );
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
  return true;
}

export function savePdpResult(
  assessmentId: string,
  token: string,
  result: PdpScoreResult,
) {
  if (!verifyPdpAssessmentAccess(assessmentId, token)) return false;
  const db = getDatabase();
  const timestamp = now();

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare(
      `UPDATE pdp_assessments
       SET status = 'completed', result_json = ?, completion_date = ?, updated_at = ?
       WHERE id = ?`,
    ).run(JSON.stringify(result), timestamp, timestamp, assessmentId);

    db.prepare('DELETE FROM pdp_risk_findings WHERE assessment_id = ?').run(assessmentId);
    const riskInsert = db.prepare(
      `INSERT INTO pdp_risk_findings (
        id, assessment_id, domain_id, risk_event, impact, likelihood, inherent_risk,
        regulatory_reference, recommended_action, priority, owner, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const risk of result.topRisks) {
      riskInsert.run(
        randomUUID(),
        assessmentId,
        null,
        risk.riskEvent,
        risk.impact,
        risk.likelihood,
        risk.inherentRisk,
        'UU No. 27 Tahun 2022',
        risk.recommendedAction,
        risk.priority,
        'Privacy / Risk Owner',
        timestamp,
      );
    }

    db.prepare('DELETE FROM pdp_roadmap_items WHERE assessment_id = ?').run(assessmentId);
    const roadmapInsert = db.prepare(
      `INSERT INTO pdp_roadmap_items
        (id, assessment_id, phase, objective, action, priority, owner, target_window, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    result.roadmap.forEach((item) => {
      roadmapInsert.run(
        randomUUID(),
        assessmentId,
        item.phase,
        'Improve ' + item.domain,
        item.action,
        item.priority,
        item.owner,
        item.phase,
        timestamp,
      );
    });

    db.prepare(
      `INSERT INTO pdp_audit_logs
        (assessment_id, actor_type, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, 'guest', 'assessment_completed', 'assessment', ?, ?, ?)`,
    ).run(
      assessmentId,
      assessmentId,
      JSON.stringify({ overallScore: result.overallScore }),
      timestamp,
    );

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
  return true;
}

export function listPdpEvidenceStorageNames(
  assessmentId: string,
  token: string,
) {
  if (!verifyPdpAssessmentAccess(assessmentId, token)) return null;
  const db = getDatabase();
  return db.prepare(
    `SELECT stored_name AS storedName
     FROM pdp_evidences
     WHERE assessment_id = ? AND deleted_at IS NULL`,
  ).all(assessmentId) as Array<{ storedName: string }>;
}

export function deletePdpAssessment(
  assessmentId: string,
  token: string,
) {
  if (!verifyPdpAssessmentAccess(assessmentId, token)) return false;
  const db = getDatabase();
  const result = db.prepare(
    'DELETE FROM pdp_assessments WHERE id = ?',
  ).run(assessmentId);
  return Number(result.changes) > 0;
}

export function logPdpEvent(
  assessmentId: string,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO pdp_audit_logs
      (assessment_id, actor_type, action, entity_type, entity_id, metadata_json, created_at)
     VALUES (?, 'guest', ?, 'assessment', ?, ?, ?)`,
  ).run(assessmentId, action, assessmentId, JSON.stringify(metadata), now());
}

export function recordPdpEvidence(input: {
  assessmentId: string;
  questionId?: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  scanStatus: string;
}) {
  const db = getDatabase();
  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    `INSERT INTO pdp_evidences (
      id, assessment_id, question_id, original_name, stored_name, mime_type,
      size_bytes, sha256, scan_status, storage_status, uploaded_at, scanned_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'stored', ?, ?)`,
  ).run(
    id,
    input.assessmentId,
    input.questionId || null,
    input.originalName,
    input.storedName,
    input.mimeType,
    input.sizeBytes,
    input.sha256,
    input.scanStatus,
    timestamp,
    input.scanStatus === 'clean' ? timestamp : null,
  );
  return id;
}

export function nextPdpReportVersion(assessmentId: string) {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT COALESCE(MAX(report_version), 0) AS current FROM pdp_report_versions WHERE assessment_id = ?',
  ).get(assessmentId) as { current: number };
  return Number(row.current || 0) + 1;
}

export function recordPdpReport(
  assessmentId: string,
  reportVersion: number,
  checksum: string,
) {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO pdp_report_versions
      (id, assessment_id, report_version, generated_at, checksum, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    assessmentId,
    reportVersion,
    now(),
    checksum,
    JSON.stringify({ format: 'pdf', generator: 'RTI PDP Report Engine v1' }),
  );
}

export function getPdpAiPrompt(code = 'executive-analysis') {
  ensurePdpSeeded();
  const db = getDatabase();
  const row = db.prepare(
    `SELECT prompt_text AS promptText, version
     FROM pdp_ai_prompts WHERE code = ? AND is_active = 1`,
  ).get(code) as { promptText?: string; version?: string } | undefined;
  return row?.promptText
    ? { promptText: row.promptText, version: row.version || '1.0' }
    : null;
}

export function getPdpEvidenceRules() {
  ensurePdpSeeded();
  const db = getDatabase();
  const rows = db.prepare(
    `SELECT code, extensions_json AS extensionsJson, mime_types_json AS mimeTypesJson,
            max_bytes AS maxBytes
     FROM pdp_evidence_types WHERE is_active = 1 ORDER BY code`,
  ).all() as Array<{
    code: string;
    extensionsJson: string;
    mimeTypesJson: string;
    maxBytes: number | null;
  }>;

  return rows.map((row) => ({
    code: row.code,
    extensions: safeJson<string[]>(row.extensionsJson, []),
    mimeTypes: safeJson<string[]>(row.mimeTypesJson, []),
    maxBytes: Number(row.maxBytes || 10 * 1024 * 1024),
  }));
}

export function getPdpScoringConfig() {
  ensurePdpSeeded();
  const db = getDatabase();
  const parameterRows = db.prepare(
    `SELECT key, numeric_value AS numericValue
     FROM pdp_scoring_parameters WHERE is_active = 1`,
  ).all() as Array<{ key: string; numericValue: number }>;

  const maturityRows = db.prepare(
    `SELECT level, label, min_score AS minScore, max_score AS maxScore
     FROM pdp_maturity_levels WHERE is_active = 1 ORDER BY level`,
  ).all() as Array<{
    level: number;
    label: string;
    minScore: number;
    maxScore: number;
  }>;

  return {
    parameters: Object.fromEntries(
      parameterRows.map((row) => [row.key, Number(row.numericValue)]),
    ) as Record<string, number>,
    maturityLevels: maturityRows.map((row) => ({
      level: Number(row.level),
      label: row.label,
      minScore: Number(row.minScore),
      maxScore: Number(row.maxScore),
    })),
  };
}

export function getAdminPdpCatalog() {
  ensurePdpSeeded();
  const db = getDatabase();
  return {
    domains: db.prepare(
      `SELECT id, code, name, description, weight, sort_order AS sortOrder,
              is_active AS active, version, updated_at AS updatedAt
       FROM pdp_domains ORDER BY sort_order, name`,
    ).all(),
    questions: db.prepare(
      `SELECT q.id, q.code, q.domain_id AS domainId, d.name AS domain,
              q.question_text AS questionText, q.question_help AS questionHelp,
              q.regulation_reference AS regulationReference,
              q.article_reference AS articleReference,
              q.control_objective AS controlObjective, q.risk_statement AS riskStatement,
              q.recommended_evidence AS recommendedEvidence, q.weight, q.criticality,
              q.answer_type AS answerType, q.answer_options_json AS answerOptionsJson,
              q.profile_requirements_json AS profileRequirementsJson,
              q.is_quick AS isQuick, q.sort_order AS sortOrder, q.status, q.version,
              q.updated_at AS updatedAt
       FROM pdp_questions q JOIN pdp_domains d ON d.id = q.domain_id
       ORDER BY q.sort_order`,
    ).all(),
    regulations: db.prepare(
      `SELECT id, title, reference_code AS referenceCode, version, effective_date AS effectiveDate,
              status, source_url AS sourceUrl, last_reviewed_at AS lastReviewedAt,
              reviewed_by AS reviewedBy, updated_at AS updatedAt
       FROM pdp_regulations ORDER BY title`,
    ).all(),
    industries: db.prepare(
      `SELECT id, code, label, description, config_json AS configJson,
              is_active AS active, sort_order AS sortOrder, updated_at AS updatedAt
       FROM pdp_industry_packs ORDER BY sort_order, label`,
    ).all(),
    scoringParameters: db.prepare(
      `SELECT key, label, numeric_value AS numericValue, description,
              is_active AS active, updated_at AS updatedAt
       FROM pdp_scoring_parameters ORDER BY key`,
    ).all(),
    maturityLevels: db.prepare(
      `SELECT level, label, min_score AS minScore, max_score AS maxScore,
              description, is_active AS active, updated_at AS updatedAt
       FROM pdp_maturity_levels ORDER BY level`,
    ).all(),
    evidenceTypes: db.prepare(
      `SELECT code, label, extensions_json AS extensionsJson, mime_types_json AS mimeTypesJson,
              max_bytes AS maxBytes, is_active AS active, updated_at AS updatedAt
       FROM pdp_evidence_types ORDER BY code`,
    ).all(),
    aiPrompts: db.prepare(
      `SELECT code, label, prompt_text AS promptText, version,
              is_active AS active, updated_at AS updatedAt
       FROM pdp_ai_prompts ORDER BY code`,
    ).all(),
    reportTemplates: db.prepare(
      `SELECT code, label, config_json AS configJson, version,
              is_active AS active, updated_at AS updatedAt
       FROM pdp_report_templates ORDER BY code`,
    ).all(),
  };
}

export function updateAdminPdpEntity(entity: string, payload: Record<string, unknown>) {
  ensurePdpSeeded();
  const db = getDatabase();
  const timestamp = now();

  if (entity === 'question') {
    const id = String(payload.id || '');
    const allowedCriticality = new Set(['Low', 'Medium', 'High', 'Critical']);
    const criticality = allowedCriticality.has(String(payload.criticality))
      ? String(payload.criticality)
      : 'Medium';
    const result = db.prepare(
      `UPDATE pdp_questions SET
        question_text = ?, question_help = ?, regulation_reference = ?,
        article_reference = ?, control_objective = ?, risk_statement = ?,
        recommended_evidence = ?, weight = ?, criticality = ?,
        profile_requirements_json = ?, is_quick = ?, sort_order = ?,
        status = ?, version = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      String(payload.questionText || '').slice(0, 2000),
      String(payload.questionHelp || '').slice(0, 2000) || null,
      String(payload.regulationReference || '').slice(0, 300) || null,
      String(payload.articleReference || '').slice(0, 160) || null,
      String(payload.controlObjective || '').slice(0, 2000) || null,
      String(payload.riskStatement || '').slice(0, 2000) || null,
      String(payload.recommendedEvidence || '').slice(0, 1000) || null,
      Math.max(0.1, Math.min(10, Number(payload.weight) || 1)),
      criticality,
      String(payload.profileRequirementsJson || '{}').slice(0, 4000),
      payload.isQuick ? 1 : 0,
      Math.trunc(Number(payload.sortOrder) || 0),
      payload.status === 'inactive' ? 'inactive' : 'active',
      String(payload.version || '1.0').slice(0, 40),
      timestamp,
      id,
    );
    return Number(result.changes) > 0;
  }

  if (entity === 'domain') {
    const result = db.prepare(
      `UPDATE pdp_domains SET name = ?, description = ?, weight = ?,
              sort_order = ?, is_active = ?, version = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      String(payload.name || '').slice(0, 300),
      String(payload.description || '').slice(0, 2000),
      Math.max(0.1, Math.min(10, Number(payload.weight) || 1)),
      Math.trunc(Number(payload.sortOrder) || 0),
      payload.active === false ? 0 : 1,
      String(payload.version || '1.0').slice(0, 40),
      timestamp,
      String(payload.id || ''),
    );
    return Number(result.changes) > 0;
  }

  if (entity === 'regulation') {
    const result = db.prepare(
      `UPDATE pdp_regulations SET title = ?, reference_code = ?, version = ?,
              effective_date = ?, status = ?, source_url = ?, last_reviewed_at = ?,
              reviewed_by = ?, updated_at = ? WHERE id = ?`,
    ).run(
      String(payload.title || '').slice(0, 500),
      String(payload.referenceCode || '').slice(0, 200),
      String(payload.version || '').slice(0, 80),
      String(payload.effectiveDate || '').slice(0, 40) || null,
      String(payload.status || 'active').slice(0, 40),
      String(payload.sourceUrl || '').slice(0, 1000) || null,
      timestamp,
      String(payload.reviewedBy || 'RTI Admin').slice(0, 200),
      timestamp,
      String(payload.id || ''),
    );
    return Number(result.changes) > 0;
  }


  if (entity === 'industry') {
    const result = db.prepare(
      `UPDATE pdp_industry_packs SET label = ?, description = ?, config_json = ?,
              is_active = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
    ).run(
      String(payload.label || '').slice(0, 240),
      String(payload.description || '').slice(0, 1000) || null,
      String(payload.configJson || '{}').slice(0, 8000),
      payload.active === false ? 0 : 1,
      Math.trunc(Number(payload.sortOrder) || 0),
      timestamp,
      String(payload.id || ''),
    );
    return Number(result.changes) > 0;
  }

  if (entity === 'scoringParameter') {
    const result = db.prepare(
      `UPDATE pdp_scoring_parameters SET label = ?, numeric_value = ?,
              description = ?, is_active = ?, updated_at = ? WHERE key = ?`,
    ).run(
      String(payload.label || '').slice(0, 240),
      Number(payload.numericValue),
      String(payload.description || '').slice(0, 1000) || null,
      payload.active === false ? 0 : 1,
      timestamp,
      String(payload.key || ''),
    );
    return Number(result.changes) > 0;
  }

  if (entity === 'maturityLevel') {
    const level = Math.trunc(Number(payload.level));
    const result = db.prepare(
      `UPDATE pdp_maturity_levels SET label = ?, min_score = ?, max_score = ?,
              description = ?, is_active = ?, updated_at = ? WHERE level = ?`,
    ).run(
      String(payload.label || '').slice(0, 240),
      Math.max(0, Math.min(100, Number(payload.minScore))),
      Math.max(0, Math.min(100, Number(payload.maxScore))),
      String(payload.description || '').slice(0, 1000) || null,
      payload.active === false ? 0 : 1,
      timestamp,
      level,
    );
    return Number(result.changes) > 0;
  }

  if (entity === 'evidenceType') {
    const result = db.prepare(
      `UPDATE pdp_evidence_types SET label = ?, extensions_json = ?,
              mime_types_json = ?, max_bytes = ?, is_active = ?, updated_at = ?
       WHERE code = ?`,
    ).run(
      String(payload.label || '').slice(0, 240),
      String(payload.extensionsJson || '[]').slice(0, 4000),
      String(payload.mimeTypesJson || '[]').slice(0, 4000),
      Math.max(1024, Math.min(25 * 1024 * 1024, Number(payload.maxBytes) || 10 * 1024 * 1024)),
      payload.active === false ? 0 : 1,
      timestamp,
      String(payload.code || ''),
    );
    return Number(result.changes) > 0;
  }

  if (entity === 'aiPrompt') {
    const result = db.prepare(
      `UPDATE pdp_ai_prompts SET label = ?, prompt_text = ?, version = ?,
              is_active = ?, updated_at = ? WHERE code = ?`,
    ).run(
      String(payload.label || '').slice(0, 240),
      String(payload.promptText || '').slice(0, 12000),
      String(payload.version || '1.0').slice(0, 40),
      payload.active === false ? 0 : 1,
      timestamp,
      String(payload.code || ''),
    );
    return Number(result.changes) > 0;
  }

  if (entity === 'reportTemplate') {
    const result = db.prepare(
      `UPDATE pdp_report_templates SET label = ?, config_json = ?, version = ?,
              is_active = ?, updated_at = ? WHERE code = ?`,
    ).run(
      String(payload.label || '').slice(0, 240),
      String(payload.configJson || '{}').slice(0, 12000),
      String(payload.version || '1.0').slice(0, 40),
      payload.active === false ? 0 : 1,
      timestamp,
      String(payload.code || ''),
    );
    return Number(result.changes) > 0;
  }

  return false;
}

export function createAdminPdpEntity(entity: string, payload: Record<string, unknown>) {
  ensurePdpSeeded();
  const db = getDatabase();
  const timestamp = now();

  if (entity === 'question') {
    const id = randomUUID();
    const code = String(payload.code || '').trim().slice(0, 120);
    const domainId = String(payload.domainId || '').trim().slice(0, 120);
    const questionText = String(payload.questionText || '').trim().slice(0, 2000);
    if (!code || !domainId || !questionText) throw new Error('Code, domain, and question text are required.');

    db.prepare(
      `INSERT INTO pdp_questions (
        id, question_set_id, domain_id, code, subdomain, question_text, question_help,
        regulation_reference, article_reference, control_objective, risk_statement,
        recommended_evidence, weight, criticality, answer_type, answer_options_json,
        branching_rule_json, industry_applicability_json, organization_size_json,
        risk_trigger_json, dpo_trigger_json, dpia_trigger_json, cross_border_trigger_json,
        profile_requirements_json, is_quick, sort_order, version, effective_date, status, updated_at
      ) VALUES (
        ?, 'pdp-question-set-v1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'choice',
        ?, '{}', '[]', '[]', '{}', '{}', '{}', '{}', ?, ?, ?, ?, ?, 'active', ?
      )`,
    ).run(
      id,
      domainId,
      code,
      String(payload.subdomain || '').slice(0, 240) || null,
      questionText,
      String(payload.questionHelp || '').slice(0, 2000) || null,
      String(payload.regulationReference || 'UU No. 27 Tahun 2022').slice(0, 300),
      String(payload.articleReference || '').slice(0, 160) || null,
      String(payload.controlObjective || '').slice(0, 2000) || null,
      String(payload.riskStatement || '').slice(0, 2000) || null,
      String(payload.recommendedEvidence || '').slice(0, 1000) || null,
      Math.max(0.1, Math.min(10, Number(payload.weight) || 1)),
      ['Low','Medium','High','Critical'].includes(String(payload.criticality))
        ? String(payload.criticality)
        : 'Medium',
      String(payload.answerOptionsJson || '["yes","partial","planned","unknown","no","na"]').slice(0, 2000),
      String(payload.profileRequirementsJson || '{}').slice(0, 4000),
      payload.isQuick ? 1 : 0,
      Math.trunc(Number(payload.sortOrder) || 10000),
      String(payload.version || '1.0').slice(0, 40),
      String(payload.effectiveDate || '').slice(0, 40) || null,
      timestamp,
    );
    return id;
  }

  if (entity === 'domain') {
    const id = randomUUID();
    const code = String(payload.code || '').trim().slice(0, 40);
    const name = String(payload.name || '').trim().slice(0, 300);
    if (!code || !name) throw new Error('Domain code and name are required.');
    db.prepare(
      `INSERT INTO pdp_domains
        (id, code, name, description, weight, sort_order, is_active, version, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    ).run(
      id,
      code,
      name,
      String(payload.description || '').slice(0, 2000),
      Math.max(0.1, Math.min(10, Number(payload.weight) || 1)),
      Math.trunc(Number(payload.sortOrder) || 1000),
      String(payload.version || '1.0').slice(0, 40),
      timestamp,
    );
    return id;
  }

  if (entity === 'regulation') {
    const id = randomUUID();
    const title = String(payload.title || '').trim().slice(0, 500);
    const referenceCode = String(payload.referenceCode || '').trim().slice(0, 200);
    if (!title || !referenceCode) throw new Error('Regulation title and reference code are required.');
    db.prepare(
      `INSERT INTO pdp_regulations (
        id, title, reference_code, version, effective_date, status, source_url,
        last_reviewed_at, reviewed_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
    ).run(
      id,
      title,
      referenceCode,
      String(payload.version || '1.0').slice(0, 80),
      String(payload.effectiveDate || '').slice(0, 40) || null,
      String(payload.sourceUrl || '').slice(0, 1000) || null,
      timestamp,
      String(payload.reviewedBy || 'RTI Admin').slice(0, 200),
      timestamp,
      timestamp,
    );
    return id;
  }

  if (entity === 'industry') {
    const id = randomUUID();
    const code = String(payload.code || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 120);
    const label = String(payload.label || '').trim().slice(0, 240);
    if (!code || !label) throw new Error('Industry code and label are required.');
    db.prepare(
      `INSERT INTO pdp_industry_packs
        (id, code, label, description, config_json, is_active, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    ).run(
      id,
      code,
      label,
      String(payload.description || '').slice(0, 1000) || null,
      String(payload.configJson || '{}').slice(0, 8000),
      Math.trunc(Number(payload.sortOrder) || 1000),
      timestamp,
    );
    return id;
  }

  throw new Error('Unsupported PDP admin entity.');
}

export function deactivateAdminPdpEntity(entity: string, id: string) {
  ensurePdpSeeded();
  const db = getDatabase();
  const timestamp = now();

  const map: Record<string, { table: string; key: string; active: string }> = {
    question: { table: 'pdp_questions', key: 'id', active: 'status' },
    domain: { table: 'pdp_domains', key: 'id', active: 'is_active' },
    regulation: { table: 'pdp_regulations', key: 'id', active: 'status' },
    industry: { table: 'pdp_industry_packs', key: 'id', active: 'is_active' },
    scoringParameter: { table: 'pdp_scoring_parameters', key: 'key', active: 'is_active' },
    maturityLevel: { table: 'pdp_maturity_levels', key: 'level', active: 'is_active' },
    evidenceType: { table: 'pdp_evidence_types', key: 'code', active: 'is_active' },
    aiPrompt: { table: 'pdp_ai_prompts', key: 'code', active: 'is_active' },
    reportTemplate: { table: 'pdp_report_templates', key: 'code', active: 'is_active' },
  };
  const target = map[entity];
  if (!target) throw new Error('Unsupported PDP admin entity.');

  if (target.active === 'status') {
    const result = db.prepare(
      'UPDATE ' + target.table + " SET status = 'inactive', updated_at = ? WHERE " + target.key + ' = ?',
    ).run(timestamp, id);
    return Number(result.changes) > 0;
  }
  const result = db.prepare(
    'UPDATE ' + target.table + ' SET ' + target.active + ' = 0, updated_at = ? WHERE ' + target.key + ' = ?',
  ).run(timestamp, id);
  return Number(result.changes) > 0;
}

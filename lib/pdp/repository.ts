import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '@/lib/server/database';
import { applicablePdpQuestions, scorePdpAssessment } from '@/lib/pdp/engine';
import type {
  PdpAnswerRecord,
  PdpAssessmentRecord,
  PdpAssessmentResult,
  PdpAssessmentType,
  PdpConfig,
  PdpOrganizationProfile,
  PdpRespondentProfile,
} from '@/lib/pdp/types';

const FRAMEWORK_VERSION = 'UU-PDP-27-2022-RTI-1.0';
const QUESTIONNAIRE_VERSION = 'PDP-2026.1';
const SCORING_MODEL_VERSION = 'PDP-SCORE-2026.1';

function now() {
  return new Date().toISOString();
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function text(value: unknown, max = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function toBool(value: unknown) {
  return value === true || value === 1 || value === '1';
}

export function writePdpAudit(params: {
  actor: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
}) {
  const db = getDatabase();
  db.prepare(
    'INSERT INTO pdp_audit_logs(actor,action,resource_type,resource_id,before_json,after_json,created_at) VALUES (?,?,?,?,?,?,?)',
  ).run(
    params.actor,
    params.action,
    params.resourceType,
    params.resourceId || null,
    params.before === undefined ? null : JSON.stringify(params.before),
    params.after === undefined ? null : JSON.stringify(params.after),
    now(),
  );
}

function parameterMap() {
  const db = getDatabase();
  const rows = db.prepare(
    "SELECT value,label FROM system_parameters WHERE group_key = 'pdp_readiness.scalar' AND is_active = 1 ORDER BY sort_order",
  ).all() as Array<{ value: string; label: string }>;
  return Object.fromEntries(rows.map((row) => [row.value, row.label]));
}

export function getPdpConfig(): PdpConfig {
  const db = getDatabase();

  const framework = db.prepare(
    'SELECT code,title FROM pdp_framework_versions WHERE code = ? AND status = ?',
  ).get(FRAMEWORK_VERSION, 'active') as
    | { code: string; title: string }
    | undefined;

  if (!framework) {
    throw new Error('UU PDP readiness framework is not available.');
  }

  const domains = db.prepare(
    'SELECT code,name,description,weight,sort_order FROM pdp_domains WHERE framework_version = ? AND is_active = 1 ORDER BY sort_order',
  ).all(FRAMEWORK_VERSION) as Array<any>;

  const questions = db.prepare(
    'SELECT id,domain_code,question_code,question_text,help_text,legal_reference,expected_evidence,risk_if_missing,recommendation,criticality,weight,is_core,estimated_seconds,sort_order FROM pdp_questions WHERE framework_version = ? AND questionnaire_version = ? AND active = 1 ORDER BY sort_order',
  ).all(FRAMEWORK_VERSION, QUESTIONNAIRE_VERSION) as Array<any>;

  const answerOptions = db.prepare(
    'SELECT value,label,description,score,is_na,sort_order FROM pdp_answer_options WHERE active = 1 ORDER BY sort_order',
  ).all() as Array<any>;

  const evidenceOptions = db.prepare(
    'SELECT value,label,multiplier,sort_order FROM pdp_evidence_options WHERE active = 1 ORDER BY sort_order',
  ).all() as Array<any>;

  const scoringWeights = db.prepare(
    'SELECT key,label,weight FROM pdp_scoring_weights WHERE active = 1 ORDER BY key',
  ).all() as Array<any>;

  const scoringThresholds = db.prepare(
    'SELECT key,min_score,max_score,label,sort_order FROM pdp_scoring_thresholds WHERE active = 1 ORDER BY sort_order',
  ).all() as Array<any>;

  const readinessGates = db.prepare(
    'SELECT key,label,question_id,minimum_score,evidence_minimum,sort_order FROM pdp_readiness_gates WHERE active = 1 ORDER BY sort_order',
  ).all() as Array<any>;

  const serviceMappings = db.prepare(
    'SELECT id,domain_code,service_name,service_url_parameter,reason_template,priority_order FROM pdp_service_mappings WHERE active = 1 ORDER BY priority_order',
  ).all() as Array<any>;

  return {
    frameworkVersion: framework.code,
    frameworkTitle: framework.title,
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    domains: domains.map((row) => ({
      code: String(row.code),
      name: String(row.name),
      description: String(row.description),
      weight: Number(row.weight),
      sortOrder: Number(row.sort_order),
    })),
    questions: questions.map((row) => ({
      id: String(row.id),
      domainCode: String(row.domain_code),
      questionCode: String(row.question_code),
      questionText: String(row.question_text),
      helpText: row.help_text == null ? null : String(row.help_text),
      legalReference: row.legal_reference == null ? null : String(row.legal_reference),
      expectedEvidence: row.expected_evidence == null ? null : String(row.expected_evidence),
      riskIfMissing: row.risk_if_missing == null ? null : String(row.risk_if_missing),
      recommendation: row.recommendation == null ? null : String(row.recommendation),
      criticality: row.criticality,
      weight: Number(row.weight),
      isCore: Number(row.is_core) === 1,
      estimatedSeconds: Number(row.estimated_seconds),
      sortOrder: Number(row.sort_order),
    })),
    answerOptions: answerOptions.map((row) => ({
      value: String(row.value),
      label: String(row.label),
      description: String(row.description),
      score: row.score == null ? null : Number(row.score),
      isNa: Number(row.is_na) === 1,
      sortOrder: Number(row.sort_order),
    })),
    evidenceOptions: evidenceOptions.map((row) => ({
      value: String(row.value),
      label: String(row.label),
      multiplier: Number(row.multiplier),
      sortOrder: Number(row.sort_order),
    })),
    scoringWeights: scoringWeights.map((row) => ({
      key: String(row.key),
      label: String(row.label),
      weight: Number(row.weight),
    })),
    scoringThresholds: scoringThresholds.map((row) => ({
      key: String(row.key),
      minScore: Number(row.min_score),
      maxScore: Number(row.max_score),
      label: String(row.label),
      sortOrder: Number(row.sort_order),
    })),
    readinessGates: readinessGates.map((row) => ({
      key: String(row.key),
      label: String(row.label),
      questionId: String(row.question_id),
      minimumScore: Number(row.minimum_score),
      evidenceMinimum: String(row.evidence_minimum),
      sortOrder: Number(row.sort_order),
    })),
    serviceMappings: serviceMappings.map((row) => ({
      id: String(row.id),
      domainCode: String(row.domain_code),
      serviceName: String(row.service_name),
      serviceUrlParameter: String(row.service_url_parameter),
      reasonTemplate: String(row.reason_template),
      priorityOrder: Number(row.priority_order),
    })),
    parameters: parameterMap(),
  };
}

export function createPdpAssessment(params: {
  organization: PdpOrganizationProfile;
  respondent: PdpRespondentProfile;
  assessmentType: PdpAssessmentType;
  organizationId?: string;
  consentVersion: string;
  evidenceProcessingConsent: boolean;
}) {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const accessToken = crypto.randomBytes(32).toString('base64url');
  const createdAt = now();

  db.prepare(
    `INSERT INTO pdp_assessments(
      id,access_token_hash,organization_id,company_name,industry,company_size,employee_count,country,location_count,
      processes_personal_data,processes_specific_data,public_service_processing,large_scale_monitoring,
      cross_border_transfer,uses_processors,automated_decisioning,
      respondent_name,respondent_title,respondent_email,respondent_phone,
      assessment_type,framework_version,questionnaire_version,scoring_model_version,
      consent_version,consent_at,evidence_processing_consent,status,started_at,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    hashToken(accessToken),
    params.organizationId || null,
    params.organization.companyName,
    params.organization.industry,
    params.organization.companySize,
    params.organization.employeeCount,
    params.organization.country || null,
    params.organization.locationCount,
    params.organization.processesPersonalData ? 1 : 0,
    params.organization.processesSpecificData ? 1 : 0,
    params.organization.publicServiceProcessing ? 1 : 0,
    params.organization.largeScaleMonitoring ? 1 : 0,
    params.organization.crossBorderTransfer ? 1 : 0,
    params.organization.usesProcessors ? 1 : 0,
    params.organization.automatedDecisioning ? 1 : 0,
    params.respondent.name,
    params.respondent.title || null,
    params.respondent.email,
    params.respondent.phone || null,
    params.assessmentType,
    FRAMEWORK_VERSION,
    QUESTIONNAIRE_VERSION,
    SCORING_MODEL_VERSION,
    params.consentVersion,
    createdAt,
    params.evidenceProcessingConsent ? 1 : 0,
    'in_progress',
    createdAt,
    createdAt,
    createdAt,
  );

  writePdpAudit({
    actor: 'Public Assessment User',
    action: 'assessment.created',
    resourceType: 'pdp_assessment',
    resourceId: id,
    after: {
      companyName: params.organization.companyName,
      assessmentType: params.assessmentType,
      frameworkVersion: FRAMEWORK_VERSION,
    },
  });

  return {
    assessment: getPdpAssessment(id),
    accessToken,
  };
}

export function verifyPdpAssessmentToken(id: string, token: string) {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT access_token_hash FROM pdp_assessments WHERE id = ?',
  ).get(id) as { access_token_hash?: string } | undefined;

  if (!row?.access_token_hash || !token) return false;
  const expected = Buffer.from(row.access_token_hash);
  const actual = Buffer.from(hashToken(token));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function getPdpAssessment(id: string): PdpAssessmentRecord | null {
  const db = getDatabase();
  const row = db.prepare(
    `SELECT id,company_name,industry,company_size,assessment_type,framework_version,
      questionnaire_version,status,implementation_score,evidence_score,overall_score,
      readiness_level,gates_completed,started_at,completed_at
     FROM pdp_assessments WHERE id = ?`,
  ).get(id) as any;

  if (!row) return null;

  return {
    id: String(row.id),
    companyName: String(row.company_name),
    industry: String(row.industry),
    companySize: String(row.company_size),
    assessmentType: row.assessment_type,
    frameworkVersion: String(row.framework_version),
    questionnaireVersion: String(row.questionnaire_version),
    status: String(row.status),
    implementationScore:
      row.implementation_score == null ? null : Number(row.implementation_score),
    evidenceScore: row.evidence_score == null ? null : Number(row.evidence_score),
    overallScore: row.overall_score == null ? null : Number(row.overall_score),
    readinessLevel:
      row.readiness_level == null ? null : String(row.readiness_level),
    gatesCompleted: Number(row.gates_completed || 0),
    startedAt: String(row.started_at),
    completedAt: row.completed_at == null ? null : String(row.completed_at),
  };
}

export function getPdpAssessmentProfile(id: string) {
  const db = getDatabase();
  return db.prepare(
    `SELECT company_name AS companyName,industry,company_size AS companySize,
      employee_count AS employeeCount,country,location_count AS locationCount,
      processes_personal_data AS processesPersonalData,
      processes_specific_data AS processesSpecificData,
      public_service_processing AS publicServiceProcessing,
      large_scale_monitoring AS largeScaleMonitoring,
      cross_border_transfer AS crossBorderTransfer,
      uses_processors AS usesProcessors,
      automated_decisioning AS automatedDecisioning,
      respondent_name AS respondentName,respondent_title AS respondentTitle,
      respondent_email AS respondentEmail,respondent_phone AS respondentPhone,
      evidence_processing_consent AS evidenceProcessingConsent
     FROM pdp_assessments WHERE id = ?`,
  ).get(id) as Record<string, unknown> | undefined;
}

export function getPdpAnswers(assessmentId: string): PdpAnswerRecord[] {
  const db = getDatabase();
  const rows = db.prepare(
    `SELECT assessment_id,question_id,answer_value,answer_score,is_na,
      applicability_justification,evidence_status,evidence_note,comment,answered_at
     FROM pdp_answers WHERE assessment_id = ? ORDER BY answered_at`,
  ).all(assessmentId) as Array<any>;

  return rows.map((row) => ({
    assessmentId: String(row.assessment_id),
    questionId: String(row.question_id),
    answerValue: String(row.answer_value),
    answerScore: row.answer_score == null ? null : Number(row.answer_score),
    isNa: Number(row.is_na) === 1,
    applicabilityJustification:
      row.applicability_justification == null
        ? null
        : String(row.applicability_justification),
    evidenceStatus: String(row.evidence_status),
    evidenceNote: row.evidence_note == null ? null : String(row.evidence_note),
    comment: row.comment == null ? null : String(row.comment),
    answeredAt: String(row.answered_at),
  }));
}

export function savePdpAnswer(params: {
  assessmentId: string;
  questionId: string;
  answerValue: string;
  evidenceStatus: string;
  applicabilityJustification?: string;
  evidenceNote?: string;
  comment?: string;
}) {
  const db = getDatabase();
  const assessment = getPdpAssessment(params.assessmentId);
  if (!assessment) throw new Error('Assessment not found.');
  if (assessment.status !== 'in_progress') {
    throw new Error('Completed assessment answers cannot be changed.');
  }

  const config = getPdpConfig();
  const allowedQuestions = applicablePdpQuestions(config, assessment.assessmentType);
  const question = allowedQuestions.find((item) => item.id === params.questionId);
  if (!question) throw new Error('Question is not applicable to this assessment.');

  const option = config.answerOptions.find((item) => item.value === params.answerValue);
  if (!option) throw new Error('Invalid answer option.');

  const evidence = config.evidenceOptions.find(
    (item) => item.value === params.evidenceStatus,
  );
  if (!evidence) throw new Error('Invalid evidence status.');

  const justification = text(params.applicabilityJustification, 3000);
  if (option.isNa && justification.length < 8) {
    throw new Error('Tidak Berlaku memerlukan justifikasi yang memadai.');
  }

  const before = db.prepare(
    'SELECT * FROM pdp_answers WHERE assessment_id = ? AND question_id = ?',
  ).get(params.assessmentId, params.questionId);

  const answeredAt = now();
  db.prepare(
    `INSERT INTO pdp_answers(
      assessment_id,question_id,answer_value,answer_score,is_na,applicability_justification,
      evidence_status,evidence_note,comment,answered_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(assessment_id,question_id) DO UPDATE SET
      answer_value=excluded.answer_value,
      answer_score=excluded.answer_score,
      is_na=excluded.is_na,
      applicability_justification=excluded.applicability_justification,
      evidence_status=excluded.evidence_status,
      evidence_note=excluded.evidence_note,
      comment=excluded.comment,
      answered_at=excluded.answered_at`,
  ).run(
    params.assessmentId,
    params.questionId,
    option.value,
    option.score,
    option.isNa ? 1 : 0,
    justification || null,
    evidence.value,
    text(params.evidenceNote, 3000) || null,
    text(params.comment, 3000) || null,
    answeredAt,
  );

  db.prepare(
    'UPDATE pdp_assessments SET updated_at = ? WHERE id = ?',
  ).run(answeredAt, params.assessmentId);

  const after = db.prepare(
    'SELECT * FROM pdp_answers WHERE assessment_id = ? AND question_id = ?',
  ).get(params.assessmentId, params.questionId);

  writePdpAudit({
    actor: 'Public Assessment User',
    action: before ? 'answer.updated' : 'answer.created',
    resourceType: 'pdp_answer',
    resourceId: params.assessmentId + '::' + params.questionId,
    before,
    after,
  });

  return getPdpAnswers(params.assessmentId).find(
    (answer) => answer.questionId === params.questionId,
  );
}

function persistPdpResult(result: PdpAssessmentResult) {
  const db = getDatabase();
  const completedAt = now();

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare('DELETE FROM pdp_domain_scores WHERE assessment_id = ?').run(result.assessmentId);
    db.prepare('DELETE FROM pdp_gap_findings WHERE assessment_id = ?').run(result.assessmentId);
    db.prepare('DELETE FROM pdp_roadmap_items WHERE assessment_id = ?').run(result.assessmentId);

    const insertDomain = db.prepare(
      `INSERT INTO pdp_domain_scores(
        assessment_id,domain_code,domain_name,implementation_score,evidence_score,overall_score,gap,status
      ) VALUES (?,?,?,?,?,?,?,?)`,
    );
    for (const domain of result.domainScores) {
      insertDomain.run(
        result.assessmentId,
        domain.domainCode,
        domain.domainName,
        domain.implementationScore,
        domain.evidenceScore,
        domain.overallScore,
        domain.gap,
        domain.status,
      );
    }

    const insertFinding = db.prepare(
      `INSERT INTO pdp_gap_findings(
        id,assessment_id,question_id,domain_code,question_code,title,severity,current_condition,
        risk,recommendation,legal_reference,created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    );
    for (const finding of result.findings) {
      insertFinding.run(
        finding.id,
        result.assessmentId,
        finding.questionId,
        finding.domainCode,
        finding.questionCode,
        finding.title,
        finding.severity,
        finding.currentCondition,
        finding.risk,
        finding.recommendation,
        finding.legalReference,
        completedAt,
      );
    }

    const insertRoadmap = db.prepare(
      `INSERT INTO pdp_roadmap_items(
        id,assessment_id,phase,domain_code,action,reason,priority,owner_suggestion,dependencies,expected_outcome,created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    );
    for (const item of result.roadmap) {
      insertRoadmap.run(
        item.id,
        result.assessmentId,
        item.phase,
        item.domainCode,
        item.action,
        item.reason,
        item.priority,
        item.ownerSuggestion,
        item.dependencies,
        item.expectedOutcome,
        completedAt,
      );
    }

    db.prepare(
      `UPDATE pdp_assessments
       SET implementation_score=?, evidence_score=?, overall_score=?, readiness_level=?,
           gates_completed=?, status='completed', completed_at=?, updated_at=?
       WHERE id=?`,
    ).run(
      result.implementationScore,
      result.evidenceScore,
      result.overallScore,
      result.readinessLevel,
      result.gates.completed,
      completedAt,
      completedAt,
      result.assessmentId,
    );

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  writePdpAudit({
    actor: 'Public Assessment User',
    action: 'assessment.completed',
    resourceType: 'pdp_assessment',
    resourceId: result.assessmentId,
    after: {
      overallScore: result.overallScore,
      readinessLevel: result.readinessLevel,
      gatesCompleted: result.gates.completed,
    },
  });
}

export function completePdpAssessment(assessmentId: string) {
  const assessment = getPdpAssessment(assessmentId);
  if (!assessment) throw new Error('Assessment not found.');

  const config = getPdpConfig();
  const answers = getPdpAnswers(assessmentId);
  const applicable = applicablePdpQuestions(config, assessment.assessmentType);
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  const missing = applicable.filter((question) => !answeredIds.has(question.id));

  if (missing.length > 0) {
    throw new Error(
      'Assessment belum lengkap. Masih ada ' +
        missing.length +
        ' pertanyaan yang belum dijawab.',
    );
  }

  const result = scorePdpAssessment({
    assessmentId,
    assessmentType: assessment.assessmentType,
    config,
    answers,
  });

  persistPdpResult(result);
  return result;
}

export function getPdpResult(assessmentId: string): PdpAssessmentResult {
  const assessment = getPdpAssessment(assessmentId);
  if (!assessment) throw new Error('Assessment not found.');

  const config = getPdpConfig();
  const answers = getPdpAnswers(assessmentId);
  return scorePdpAssessment({
    assessmentId,
    assessmentType: assessment.assessmentType,
    config,
    answers,
  });
}

export function getPdpEvidence(assessmentId: string) {
  const db = getDatabase();
  return db.prepare(
    `SELECT id,question_id AS questionId,original_name AS originalName,mime_type AS mimeType,
      size_bytes AS sizeBytes,classification,scan_status AS scanStatus,created_at AS createdAt
     FROM pdp_evidence_files WHERE assessment_id = ? ORDER BY created_at DESC`,
  ).all(assessmentId);
}

export function pdpEvidenceDirectory() {
  if (process.env.NODE_ENV === 'production' && process.env.RTI_FILE_UPLOADS_ENABLED !== 'true') {
    throw new Error('Evidence upload is disabled until secure production storage is configured.');
  }
  const configured = String(process.env.RTI_UPLOAD_DIR || '').trim();
  const root = configured
    ? path.resolve(configured)
    : path.join(process.cwd(), 'data', 'uploads');
  const directory = path.join(root, 'pdp');
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

export function recordPdpEvidence(params: {
  assessmentId: string;
  questionId?: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  classification: string;
}) {
  const db = getDatabase();
  const assessment = getPdpAssessment(params.assessmentId);
  if (!assessment) throw new Error('Assessment not found.');

  if (params.questionId) {
    const config = getPdpConfig();
    const question = applicablePdpQuestions(config, assessment.assessmentType)
      .find((item) => item.id === params.questionId);
    if (!question) throw new Error('Question is not applicable.');
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO pdp_evidence_files(
      id,assessment_id,question_id,original_name,stored_name,mime_type,size_bytes,classification,scan_status,created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    params.assessmentId,
    params.questionId || null,
    params.originalName,
    params.storedName,
    params.mimeType,
    params.sizeBytes,
    params.classification,
    'pending',
    now(),
  );

  if (params.questionId) {
    db.prepare(
      `UPDATE pdp_answers
       SET evidence_status = CASE
         WHEN evidence_status IN ('reviewed') THEN evidence_status
         ELSE 'uploaded'
       END, answered_at = ?
       WHERE assessment_id = ? AND question_id = ?`,
    ).run(now(), params.assessmentId, params.questionId);
  }

  writePdpAudit({
    actor: 'Public Assessment User',
    action: 'evidence.uploaded',
    resourceType: 'pdp_evidence',
    resourceId: id,
    after: {
      questionId: params.questionId || null,
      originalName: params.originalName,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
    },
  });

  return { id, scanStatus: 'pending' };
}

export function deletePdpEvidence(assessmentId: string, evidenceId: string) {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT stored_name FROM pdp_evidence_files WHERE id = ? AND assessment_id = ?',
  ).get(evidenceId, assessmentId) as { stored_name?: string } | undefined;
  if (!row?.stored_name) throw new Error('Evidence file not found.');

  try {
    fs.rmSync(
      path.join(pdpEvidenceDirectory(), path.basename(row.stored_name)),
      { force: true },
    );
  } catch {
    // Database deletion remains authoritative if the file is already missing.
  }

  db.prepare(
    'DELETE FROM pdp_evidence_files WHERE id = ? AND assessment_id = ?',
  ).run(evidenceId, assessmentId);

  writePdpAudit({
    actor: 'Public Assessment User',
    action: 'evidence.deleted',
    resourceType: 'pdp_evidence',
    resourceId: evidenceId,
  });

  return { deleted: true };
}

export function deletePdpAssessment(assessmentId: string) {
  const db = getDatabase();
  const files = db.prepare(
    'SELECT stored_name FROM pdp_evidence_files WHERE assessment_id = ?',
  ).all(assessmentId) as Array<{ stored_name: string }>;

  for (const file of files) {
    try {
      fs.rmSync(
        path.join(pdpEvidenceDirectory(), path.basename(file.stored_name)),
        { force: true },
      );
    } catch {
      // Continue if a stale file is already unavailable.
    }
  }

  const result = db.prepare(
    'DELETE FROM pdp_assessments WHERE id = ?',
  ).run(assessmentId);

  if (Number(result.changes) < 1) throw new Error('Assessment not found.');

  writePdpAudit({
    actor: 'Public Assessment User',
    action: 'assessment.deleted',
    resourceType: 'pdp_assessment',
    resourceId: assessmentId,
  });

  return { deleted: true };
}

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { getRuntimeDatabase, type RuntimeDatabase, type SqlValue } from '@/lib/server/runtime-database';
import { deletePrivateObject } from '@/lib/server/object-storage';
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
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function text(value: unknown, max = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function database() {
  return getRuntimeDatabase();
}

export async function writePdpAuditRuntime(params: {
  actor: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
}) {
  const db = await database();
  await db.run(
    'INSERT INTO pdp_audit_logs(actor,action,resource_type,resource_id,before_json,after_json,created_at) VALUES (?,?,?,?,?,?,?)',
    [
      params.actor,
      params.action,
      params.resourceType,
      params.resourceId || null,
      params.before === undefined ? null : JSON.stringify(params.before),
      params.after === undefined ? null : JSON.stringify(params.after),
      now(),
    ],
  );
}

async function parameterMap(db: RuntimeDatabase) {
  const rows = await db.queryAll<{ value: string; label: string }>(
    "SELECT value,label FROM system_parameters WHERE group_key = 'pdp_readiness.scalar' AND is_active = 1 ORDER BY sort_order",
  );
  return Object.fromEntries(rows.map((row) => [row.value, row.label]));
}

export async function getPdpConfigRuntime(): Promise<PdpConfig> {
  const db = await database();
  const framework = await db.queryOne<{ code: string; title: string }>(
    'SELECT code,title FROM pdp_framework_versions WHERE code = ? AND status = ?',
    [FRAMEWORK_VERSION, 'active'],
  );
  if (!framework) throw new Error('UU PDP readiness framework is not available.');

  const [domains, questions, answerOptions, evidenceOptions, scoringWeights, scoringThresholds, readinessGates, serviceMappings, parameters] =
    await Promise.all([
      db.queryAll<any>(
        'SELECT code,name,description,weight,sort_order FROM pdp_domains WHERE framework_version = ? AND is_active = 1 ORDER BY sort_order',
        [FRAMEWORK_VERSION],
      ),
      db.queryAll<any>(
        'SELECT id,domain_code,question_code,question_text,help_text,legal_reference,expected_evidence,risk_if_missing,recommendation,criticality,weight,is_core,estimated_seconds,sort_order FROM pdp_questions WHERE framework_version = ? AND questionnaire_version = ? AND active = 1 ORDER BY sort_order',
        [FRAMEWORK_VERSION, QUESTIONNAIRE_VERSION],
      ),
      db.queryAll<any>(
        'SELECT value,label,description,score,is_na,sort_order FROM pdp_answer_options WHERE active = 1 ORDER BY sort_order',
      ),
      db.queryAll<any>(
        'SELECT value,label,multiplier,sort_order FROM pdp_evidence_options WHERE active = 1 ORDER BY sort_order',
      ),
      db.queryAll<any>(
        'SELECT key,label,weight FROM pdp_scoring_weights WHERE active = 1 ORDER BY key',
      ),
      db.queryAll<any>(
        'SELECT key,min_score,max_score,label,sort_order FROM pdp_scoring_thresholds WHERE active = 1 ORDER BY sort_order',
      ),
      db.queryAll<any>(
        'SELECT key,label,question_id,minimum_score,evidence_minimum,sort_order FROM pdp_readiness_gates WHERE active = 1 ORDER BY sort_order',
      ),
      db.queryAll<any>(
        'SELECT id,domain_code,service_name,service_url_parameter,reason_template,priority_order FROM pdp_service_mappings WHERE active = 1 ORDER BY priority_order',
      ),
      parameterMap(db),
    ]);

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
    parameters,
  };
}

export async function createPdpAssessmentRuntime(params: {
  organization: PdpOrganizationProfile;
  respondent: PdpRespondentProfile;
  assessmentType: PdpAssessmentType;
  organizationId?: string;
  consentVersion: string;
  evidenceProcessingConsent: boolean;
}) {
  const db = await database();
  const id = randomUUID();
  const accessToken = randomBytes(32).toString('base64url');
  const createdAt = now();

  await db.batch([
    {
      sql: `INSERT INTO pdp_assessments(
        id,access_token_hash,organization_id,company_name,industry,company_size,employee_count,country,location_count,
        processes_personal_data,processes_specific_data,public_service_processing,large_scale_monitoring,
        cross_border_transfer,uses_processors,automated_decisioning,
        respondent_name,respondent_title,respondent_email,respondent_phone,
        assessment_type,framework_version,questionnaire_version,scoring_model_version,
        consent_version,consent_at,evidence_processing_consent,status,started_at,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      params: [
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
      ],
    },
    {
      sql: 'INSERT INTO pdp_audit_logs(actor,action,resource_type,resource_id,before_json,after_json,created_at) VALUES (?,?,?,?,?,?,?)',
      params: [
        'Public Assessment User',
        'assessment.created',
        'pdp_assessment',
        id,
        null,
        JSON.stringify({
          companyName: params.organization.companyName,
          assessmentType: params.assessmentType,
          frameworkVersion: FRAMEWORK_VERSION,
        }),
        createdAt,
      ],
    },
  ]);

  return {
    assessment: await getPdpAssessmentRuntime(id),
    accessToken,
  };
}

export async function verifyPdpAssessmentTokenRuntime(id: string, token: string) {
  const db = await database();
  const row = await db.queryOne<{ access_token_hash?: string }>(
    'SELECT access_token_hash FROM pdp_assessments WHERE id = ?',
    [id],
  );
  if (!row?.access_token_hash || !token) return false;

  const expected = Buffer.from(row.access_token_hash, 'utf8');
  const actual = Buffer.from(hashToken(token), 'utf8');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function getPdpAssessmentRuntime(id: string): Promise<PdpAssessmentRecord | null> {
  const db = await database();
  const row = await db.queryOne<any>(
    `SELECT id,company_name,industry,company_size,assessment_type,framework_version,
      questionnaire_version,status,implementation_score,evidence_score,overall_score,
      readiness_level,gates_completed,started_at,completed_at
     FROM pdp_assessments WHERE id = ?`,
    [id],
  );
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
    implementationScore: row.implementation_score == null ? null : Number(row.implementation_score),
    evidenceScore: row.evidence_score == null ? null : Number(row.evidence_score),
    overallScore: row.overall_score == null ? null : Number(row.overall_score),
    readinessLevel: row.readiness_level == null ? null : String(row.readiness_level),
    gatesCompleted: Number(row.gates_completed || 0),
    startedAt: String(row.started_at),
    completedAt: row.completed_at == null ? null : String(row.completed_at),
  };
}

export async function getPdpAssessmentProfileRuntime(id: string) {
  const db = await database();
  return db.queryOne<Record<string, unknown>>(
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
    [id],
  );
}

export async function getPdpAnswersRuntime(assessmentId: string): Promise<PdpAnswerRecord[]> {
  const db = await database();
  const rows = await db.queryAll<any>(
    `SELECT assessment_id,question_id,answer_value,answer_score,is_na,
      applicability_justification,evidence_status,evidence_note,comment,answered_at
     FROM pdp_answers WHERE assessment_id = ? ORDER BY answered_at`,
    [assessmentId],
  );
  return rows.map((row) => ({
    assessmentId: String(row.assessment_id),
    questionId: String(row.question_id),
    answerValue: String(row.answer_value),
    answerScore: row.answer_score == null ? null : Number(row.answer_score),
    isNa: Number(row.is_na) === 1,
    applicabilityJustification:
      row.applicability_justification == null ? null : String(row.applicability_justification),
    evidenceStatus: String(row.evidence_status),
    evidenceNote: row.evidence_note == null ? null : String(row.evidence_note),
    comment: row.comment == null ? null : String(row.comment),
    answeredAt: String(row.answered_at),
  }));
}

export async function savePdpAnswerRuntime(params: {
  assessmentId: string;
  questionId: string;
  answerValue: string;
  evidenceStatus: string;
  applicabilityJustification?: string;
  evidenceNote?: string;
  comment?: string;
}) {
  const db = await database();
  const assessment = await getPdpAssessmentRuntime(params.assessmentId);
  if (!assessment) throw new Error('Assessment not found.');
  if (assessment.status !== 'in_progress') {
    throw new Error('Completed assessment answers cannot be changed.');
  }

  const config = await getPdpConfigRuntime();
  const question = applicablePdpQuestions(config, assessment.assessmentType)
    .find((item) => item.id === params.questionId);
  if (!question) throw new Error('Question is not applicable to this assessment.');

  const option = config.answerOptions.find((item) => item.value === params.answerValue);
  if (!option) throw new Error('Invalid answer option.');
  const evidence = config.evidenceOptions.find((item) => item.value === params.evidenceStatus);
  if (!evidence) throw new Error('Invalid evidence status.');

  const justification = text(params.applicabilityJustification, 3000);
  if (option.isNa && justification.length < 8) {
    throw new Error('Tidak Berlaku memerlukan justifikasi yang memadai.');
  }

  const before = await db.queryOne<Record<string, unknown>>(
    'SELECT * FROM pdp_answers WHERE assessment_id = ? AND question_id = ?',
    [params.assessmentId, params.questionId],
  );
  const answeredAt = now();

  await db.batch([
    {
      sql: `INSERT INTO pdp_answers(
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
      params: [
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
      ],
    },
    {
      sql: 'UPDATE pdp_assessments SET updated_at = ? WHERE id = ?',
      params: [answeredAt, params.assessmentId],
    },
  ]);

  const after = await db.queryOne<Record<string, unknown>>(
    'SELECT * FROM pdp_answers WHERE assessment_id = ? AND question_id = ?',
    [params.assessmentId, params.questionId],
  );
  await writePdpAuditRuntime({
    actor: 'Public Assessment User',
    action: before ? 'answer.updated' : 'answer.created',
    resourceType: 'pdp_answer',
    resourceId: params.assessmentId + '::' + params.questionId,
    before,
    after,
  });

  return (await getPdpAnswersRuntime(params.assessmentId))
    .find((answer) => answer.questionId === params.questionId);
}

async function persistPdpResultRuntime(db: RuntimeDatabase, result: PdpAssessmentResult) {
  const completedAt = now();
  const statements: Array<{ sql: string; params?: SqlValue[] }> = [
    { sql: 'DELETE FROM pdp_domain_scores WHERE assessment_id = ?', params: [result.assessmentId] },
    { sql: 'DELETE FROM pdp_gap_findings WHERE assessment_id = ?', params: [result.assessmentId] },
    { sql: 'DELETE FROM pdp_roadmap_items WHERE assessment_id = ?', params: [result.assessmentId] },
  ];

  for (const domain of result.domainScores) {
    statements.push({
      sql: `INSERT INTO pdp_domain_scores(
        assessment_id,domain_code,domain_name,implementation_score,evidence_score,overall_score,gap,status
      ) VALUES (?,?,?,?,?,?,?,?)`,
      params: [
        result.assessmentId,
        domain.domainCode,
        domain.domainName,
        domain.implementationScore,
        domain.evidenceScore,
        domain.overallScore,
        domain.gap,
        domain.status,
      ],
    });
  }

  for (const finding of result.findings) {
    statements.push({
      sql: `INSERT INTO pdp_gap_findings(
        id,assessment_id,question_id,domain_code,question_code,title,severity,current_condition,
        risk,recommendation,legal_reference,created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      params: [
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
      ],
    });
  }

  for (const item of result.roadmap) {
    statements.push({
      sql: `INSERT INTO pdp_roadmap_items(
        id,assessment_id,phase,domain_code,action,reason,priority,owner_suggestion,dependencies,expected_outcome,created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      params: [
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
      ],
    });
  }

  statements.push({
    sql: `UPDATE pdp_assessments
      SET implementation_score=?, evidence_score=?, overall_score=?, readiness_level=?,
          gates_completed=?, status='completed', completed_at=?, updated_at=?
      WHERE id=?`,
    params: [
      result.implementationScore,
      result.evidenceScore,
      result.overallScore,
      result.readinessLevel,
      result.gates.completed,
      completedAt,
      completedAt,
      result.assessmentId,
    ],
  });

  await db.batch(statements);
  await writePdpAuditRuntime({
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

export async function completePdpAssessmentRuntime(assessmentId: string) {
  const assessment = await getPdpAssessmentRuntime(assessmentId);
  if (!assessment) throw new Error('Assessment not found.');

  const config = await getPdpConfigRuntime();
  const answers = await getPdpAnswersRuntime(assessmentId);
  const applicable = applicablePdpQuestions(config, assessment.assessmentType);
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  const missing = applicable.filter((question) => !answeredIds.has(question.id));
  if (missing.length > 0) {
    throw new Error(
      'Assessment belum lengkap. Masih ada ' + missing.length + ' pertanyaan yang belum dijawab.',
    );
  }

  const result = scorePdpAssessment({
    assessmentId,
    assessmentType: assessment.assessmentType,
    config,
    answers,
  });
  const db = await database();
  await persistPdpResultRuntime(db, result);
  return result;
}

export async function getPdpResultRuntime(assessmentId: string): Promise<PdpAssessmentResult> {
  const assessment = await getPdpAssessmentRuntime(assessmentId);
  if (!assessment) throw new Error('Assessment not found.');
  const [config, answers] = await Promise.all([
    getPdpConfigRuntime(),
    getPdpAnswersRuntime(assessmentId),
  ]);
  return scorePdpAssessment({
    assessmentId,
    assessmentType: assessment.assessmentType,
    config,
    answers,
  });
}

export async function getPdpEvidenceRuntime(assessmentId: string) {
  const db = await database();
  return db.queryAll<Record<string, unknown>>(
    `SELECT id,question_id AS questionId,original_name AS originalName,mime_type AS mimeType,
      size_bytes AS sizeBytes,classification,scan_status AS scanStatus,created_at AS createdAt
     FROM pdp_evidence_files WHERE assessment_id = ? ORDER BY created_at DESC`,
    [assessmentId],
  );
}

export async function recordPdpEvidenceRuntime(params: {
  assessmentId: string;
  questionId?: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  classification: string;
}) {
  const db = await database();
  const assessment = await getPdpAssessmentRuntime(params.assessmentId);
  if (!assessment) throw new Error('Assessment not found.');

  if (params.questionId) {
    const config = await getPdpConfigRuntime();
    const question = applicablePdpQuestions(config, assessment.assessmentType)
      .find((item) => item.id === params.questionId);
    if (!question) throw new Error('Question is not applicable.');
  }

  const id = randomUUID();
  const createdAt = now();
  const statements: Array<{ sql: string; params?: SqlValue[] }> = [
    {
      sql: `INSERT INTO pdp_evidence_files(
        id,assessment_id,question_id,original_name,stored_name,mime_type,size_bytes,classification,scan_status,created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      params: [
        id,
        params.assessmentId,
        params.questionId || null,
        params.originalName,
        params.storedName,
        params.mimeType,
        params.sizeBytes,
        params.classification,
        'pending',
        createdAt,
      ],
    },
  ];

  if (params.questionId) {
    statements.push({
      sql: `UPDATE pdp_answers
       SET evidence_status = CASE
         WHEN evidence_status = 'reviewed' THEN evidence_status
         ELSE 'uploaded'
       END, answered_at = ?
       WHERE assessment_id = ? AND question_id = ?`,
      params: [createdAt, params.assessmentId, params.questionId],
    });
  }

  await db.batch(statements);
  await writePdpAuditRuntime({
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

export async function deletePdpEvidenceRuntime(assessmentId: string, evidenceId: string) {
  const db = await database();
  const row = await db.queryOne<{ stored_name?: string }>(
    'SELECT stored_name FROM pdp_evidence_files WHERE id = ? AND assessment_id = ?',
    [evidenceId, assessmentId],
  );
  if (!row?.stored_name) throw new Error('Evidence file not found.');

  await deletePrivateObject(row.stored_name);
  await db.run(
    'DELETE FROM pdp_evidence_files WHERE id = ? AND assessment_id = ?',
    [evidenceId, assessmentId],
  );
  await writePdpAuditRuntime({
    actor: 'Public Assessment User',
    action: 'evidence.deleted',
    resourceType: 'pdp_evidence',
    resourceId: evidenceId,
  });
  return { deleted: true };
}

export async function deletePdpAssessmentRuntime(assessmentId: string) {
  const db = await database();
  const files = await db.queryAll<{ stored_name: string }>(
    'SELECT stored_name FROM pdp_evidence_files WHERE assessment_id = ?',
    [assessmentId],
  );
  for (const file of files) {
    await deletePrivateObject(file.stored_name).catch(() => undefined);
  }

  const result = await db.run('DELETE FROM pdp_assessments WHERE id = ?', [assessmentId]);
  if (!result.changes) throw new Error('Assessment not found.');

  await writePdpAuditRuntime({
    actor: 'Public Assessment User',
    action: 'assessment.deleted',
    resourceType: 'pdp_assessment',
    resourceId: assessmentId,
  });
  return { deleted: true };
}

export async function getPdpAdminDashboardRuntime() {
  const db = await database();
  const [config, stats, assessments, topGaps, auditLogs, allDomains, allQuestions, allAnswerOptions, allEvidenceOptions, allGates, allServices] = await Promise.all([
    getPdpConfigRuntime(),
    db.queryOne<any>(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
        AVG(CASE WHEN status = 'completed' THEN overall_score END) AS average_score,
        AVG(CASE WHEN status = 'completed' THEN evidence_score END) AS average_evidence
       FROM pdp_assessments`,
    ),
    db.queryAll<any>(
      `SELECT id,company_name,industry,company_size,respondent_name,respondent_email,
        assessment_type,status,overall_score,readiness_level,evidence_score,gates_completed,
        started_at,completed_at
       FROM pdp_assessments
       ORDER BY created_at DESC
       LIMIT 100`,
    ),
    db.queryAll<any>(
      `SELECT domain_code,severity,question_code,title,COUNT(*) AS occurrences
       FROM pdp_gap_findings
       GROUP BY domain_code,severity,question_code,title
       ORDER BY
         CASE severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
         occurrences DESC
       LIMIT 20`,
    ),
    db.queryAll<any>(
      `SELECT id,actor,action,resource_type,resource_id,created_at
       FROM pdp_audit_logs
       ORDER BY id DESC
       LIMIT 100`,
    ),
    db.queryAll<any>(
      'SELECT code,name,description,weight,sort_order,is_active FROM pdp_domains WHERE framework_version = ? ORDER BY sort_order',
      [FRAMEWORK_VERSION],
    ),
    db.queryAll<any>(
      'SELECT id,domain_code,question_code,question_text,help_text,legal_reference,expected_evidence,risk_if_missing,recommendation,criticality,weight,is_core,estimated_seconds,sort_order,active FROM pdp_questions WHERE framework_version = ? AND questionnaire_version = ? ORDER BY sort_order',
      [FRAMEWORK_VERSION, QUESTIONNAIRE_VERSION],
    ),
    db.queryAll<any>(
      'SELECT value,label,description,score,is_na,sort_order,active FROM pdp_answer_options ORDER BY sort_order',
    ),
    db.queryAll<any>(
      'SELECT value,label,multiplier,sort_order,active FROM pdp_evidence_options ORDER BY sort_order',
    ),
    db.queryAll<any>(
      'SELECT key,label,question_id,minimum_score,evidence_minimum,sort_order,active FROM pdp_readiness_gates ORDER BY sort_order',
    ),
    db.queryAll<any>(
      'SELECT id,domain_code,service_name,service_url_parameter,reason_template,priority_order,active FROM pdp_service_mappings ORDER BY priority_order',
    ),
  ]);

  const adminConfig = {
    ...config,
    domains: allDomains.map((row) => ({
      code: String(row.code),
      name: String(row.name),
      description: String(row.description),
      weight: Number(row.weight),
      sortOrder: Number(row.sort_order),
      active: Number(row.is_active) === 1,
    })),
    questions: allQuestions.map((row) => ({
      id: String(row.id),
      domainCode: String(row.domain_code),
      questionCode: String(row.question_code),
      questionText: String(row.question_text),
      helpText: row.help_text == null ? null : String(row.help_text),
      legalReference: row.legal_reference == null ? null : String(row.legal_reference),
      expectedEvidence: row.expected_evidence == null ? null : String(row.expected_evidence),
      riskIfMissing: row.risk_if_missing == null ? null : String(row.risk_if_missing),
      recommendation: row.recommendation == null ? null : String(row.recommendation),
      criticality: String(row.criticality),
      weight: Number(row.weight),
      isCore: Number(row.is_core) === 1,
      estimatedSeconds: Number(row.estimated_seconds),
      sortOrder: Number(row.sort_order),
      active: Number(row.active) === 1,
    })),
    answerOptions: allAnswerOptions.map((row) => ({
      value: String(row.value),
      label: String(row.label),
      description: String(row.description),
      score: row.score == null ? null : Number(row.score),
      isNa: Number(row.is_na) === 1,
      sortOrder: Number(row.sort_order),
      active: Number(row.active) === 1,
    })),
    evidenceOptions: allEvidenceOptions.map((row) => ({
      value: String(row.value),
      label: String(row.label),
      multiplier: Number(row.multiplier),
      sortOrder: Number(row.sort_order),
      active: Number(row.active) === 1,
    })),
    readinessGates: allGates.map((row) => ({
      key: String(row.key),
      label: String(row.label),
      questionId: String(row.question_id),
      minimumScore: Number(row.minimum_score),
      evidenceMinimum: String(row.evidence_minimum),
      sortOrder: Number(row.sort_order),
      active: Number(row.active) === 1,
    })),
    serviceMappings: allServices.map((row) => ({
      id: String(row.id),
      domainCode: String(row.domain_code),
      serviceName: String(row.service_name),
      serviceUrlParameter: String(row.service_url_parameter),
      reasonTemplate: String(row.reason_template),
      priorityOrder: Number(row.priority_order),
      active: Number(row.active) === 1,
    })),
  };

  return {
    config: adminConfig,
    stats: {
      total: Number(stats?.total || 0),
      completed: Number(stats?.completed || 0),
      inProgress: Number(stats?.in_progress || 0),
      averageScore:
        stats?.average_score == null ? null : Math.round(Number(stats.average_score) * 10) / 10,
      averageEvidence:
        stats?.average_evidence == null ? null : Math.round(Number(stats.average_evidence) * 10) / 10,
    },
    assessments,
    topGaps,
    auditLogs,
  };
}

export async function patchPdpAdminConfigRuntime(params: {
  entity: string;
  key: string;
  changes: Record<string, unknown>;
}) {
  const db = await database();
  const timestamp = now();
  const { entity, key, changes } = params;
  const asNumber = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const asBool = (value: unknown, fallback: boolean) =>
    value === undefined ? fallback : value === true || value === 1;

  let before: Record<string, unknown> | null = null;
  let after: Record<string, unknown> | null = null;

  if (entity === 'question') {
    before = await db.queryOne('SELECT * FROM pdp_questions WHERE id = ?', [key]);
    if (!before) throw new Error('Question not found.');
    const criticality = text(changes.criticality ?? before.criticality, 20);
    if (!['Critical','High','Medium','Low'].includes(criticality)) throw new Error('Invalid criticality.');
    await db.run(
      `UPDATE pdp_questions SET
        question_text=?,help_text=?,expected_evidence=?,risk_if_missing=?,recommendation=?,
        legal_reference=?,criticality=?,weight=?,is_core=?,active=?,updated_at=?
       WHERE id=?`,
      [
        text(changes.questionText ?? before.question_text, 2500),
        text(changes.helpText ?? before.help_text, 3000) || null,
        text(changes.expectedEvidence ?? before.expected_evidence, 3000) || null,
        text(changes.riskIfMissing ?? before.risk_if_missing, 3000) || null,
        text(changes.recommendation ?? before.recommendation, 3000) || null,
        text(changes.legalReference ?? before.legal_reference, 500) || null,
        criticality,
        Math.max(0.1, asNumber(changes.weight, Number(before.weight || 1))),
        asBool(changes.isCore, Number(before.is_core) === 1) ? 1 : 0,
        asBool(changes.active, Number(before.active) === 1) ? 1 : 0,
        timestamp,
        key,
      ],
    );
    after = await db.queryOne('SELECT * FROM pdp_questions WHERE id = ?', [key]);
  } else if (entity === 'domain') {
    const [frameworkVersion, domainCode] = key.split('::');
    before = await db.queryOne(
      'SELECT * FROM pdp_domains WHERE framework_version = ? AND code = ?',
      [frameworkVersion, domainCode],
    );
    if (!before) throw new Error('Domain not found.');
    await db.run(
      'UPDATE pdp_domains SET name=?,description=?,weight=?,is_active=? WHERE framework_version=? AND code=?',
      [
        text(changes.name ?? before.name, 180),
        text(changes.description ?? before.description, 1500),
        Math.max(0.1, asNumber(changes.weight, Number(before.weight || 1))),
        asBool(changes.active, Number(before.is_active) === 1) ? 1 : 0,
        frameworkVersion,
        domainCode,
      ],
    );
    after = await db.queryOne(
      'SELECT * FROM pdp_domains WHERE framework_version = ? AND code = ?',
      [frameworkVersion, domainCode],
    );
  } else if (entity === 'threshold') {
    before = await db.queryOne('SELECT * FROM pdp_scoring_thresholds WHERE key = ?', [key]);
    if (!before) throw new Error('Threshold not found.');
    const minScore = Math.max(0, Math.min(100, asNumber(changes.minScore, Number(before.min_score))));
    const maxScore = Math.max(0, Math.min(100, asNumber(changes.maxScore, Number(before.max_score))));
    if (minScore > maxScore) throw new Error('Minimum cannot exceed maximum.');
    await db.run(
      'UPDATE pdp_scoring_thresholds SET min_score=?,max_score=?,label=? WHERE key=?',
      [minScore, maxScore, text(changes.label ?? before.label, 160), key],
    );
    after = await db.queryOne('SELECT * FROM pdp_scoring_thresholds WHERE key = ?', [key]);
  } else if (entity === 'scoring-weight') {
    before = await db.queryOne('SELECT * FROM pdp_scoring_weights WHERE key = ?', [key]);
    if (!before) throw new Error('Scoring weight not found.');
    await db.run(
      'UPDATE pdp_scoring_weights SET weight=? WHERE key=?',
      [Math.max(0, asNumber(changes.weight, Number(before.weight))), key],
    );
    after = await db.queryOne('SELECT * FROM pdp_scoring_weights WHERE key = ?', [key]);
  } else if (entity === 'gate') {
    before = await db.queryOne('SELECT * FROM pdp_readiness_gates WHERE key = ?', [key]);
    if (!before) throw new Error('Readiness gate not found.');
    await db.run(
      'UPDATE pdp_readiness_gates SET label=?,minimum_score=?,evidence_minimum=?,active=? WHERE key=?',
      [
        text(changes.label ?? before.label, 160),
        Math.max(0, Math.min(100, asNumber(changes.minimumScore, Number(before.minimum_score)))),
        text(changes.evidenceMinimum ?? before.evidence_minimum, 80),
        asBool(changes.active, Number(before.active) === 1) ? 1 : 0,
        key,
      ],
    );
    after = await db.queryOne('SELECT * FROM pdp_readiness_gates WHERE key = ?', [key]);
  } else if (entity === 'answer-option') {
    before = await db.queryOne('SELECT * FROM pdp_answer_options WHERE value = ?', [key]);
    if (!before) throw new Error('Answer option not found.');
    const requestedScore = changes.score === undefined ? before.score : changes.score;
    const score =
      requestedScore === null
        ? null
        : Math.max(0, Math.min(100, asNumber(requestedScore, Number(before.score || 0))));
    await db.run(
      'UPDATE pdp_answer_options SET label=?,description=?,score=?,active=? WHERE value=?',
      [
        text(changes.label ?? before.label, 160),
        text(changes.description ?? before.description, 800),
        score,
        asBool(changes.active, Number(before.active) === 1) ? 1 : 0,
        key,
      ],
    );
    after = await db.queryOne('SELECT * FROM pdp_answer_options WHERE value = ?', [key]);
  } else if (entity === 'evidence-option') {
    before = await db.queryOne('SELECT * FROM pdp_evidence_options WHERE value = ?', [key]);
    if (!before) throw new Error('Evidence option not found.');
    await db.run(
      'UPDATE pdp_evidence_options SET label=?,multiplier=?,active=? WHERE value=?',
      [
        text(changes.label ?? before.label, 160),
        Math.max(0, Math.min(1, asNumber(changes.multiplier, Number(before.multiplier)))),
        asBool(changes.active, Number(before.active) === 1) ? 1 : 0,
        key,
      ],
    );
    after = await db.queryOne('SELECT * FROM pdp_evidence_options WHERE value = ?', [key]);
  } else if (entity === 'service') {
    before = await db.queryOne('SELECT * FROM pdp_service_mappings WHERE id = ?', [key]);
    if (!before) throw new Error('Service mapping not found.');
    await db.run(
      'UPDATE pdp_service_mappings SET service_name=?,reason_template=?,active=? WHERE id=?',
      [
        text(changes.serviceName ?? before.service_name, 240),
        text(changes.reasonTemplate ?? before.reason_template, 2000),
        asBool(changes.active, Number(before.active) === 1) ? 1 : 0,
        key,
      ],
    );
    after = await db.queryOne('SELECT * FROM pdp_service_mappings WHERE id = ?', [key]);
  } else {
    throw new Error('Unsupported PDP admin entity.');
  }

  await writePdpAuditRuntime({
    actor: 'RTI Admin',
    action: 'admin.' + entity + '.updated',
    resourceType: 'pdp_' + entity,
    resourceId: key,
    before,
    after,
  });

  return after;
}

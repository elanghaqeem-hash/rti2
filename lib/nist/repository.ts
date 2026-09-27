import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { getDatabase } from '@/lib/server/database';
import type {
  NistAnswerInput,
  NistAnswerRecord,
  NistAssessmentConfig,
  NistAssessmentRecord,
  NistAssessmentResult,
  NistAssessmentType,
  NistOrganizationProfile,
  NistRespondentProfile,
} from '@/lib/nist/types';

const SCORING_MODEL_VERSION = 'SCORE-2026.1';
const RECOMMENDATION_VERSION = 'REC-2026.1';

function hashAccessToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown) {
  return Number(value) === 1;
}

export function getNistAssessmentConfig(options?: {
  frameworkVersion?: string;
  questionnaireVersion?: string;
}): NistAssessmentConfig {
  const db = getDatabase();
  const framework = options?.frameworkVersion
    ? db.prepare(
        `SELECT code FROM nist_framework_versions WHERE code = ? LIMIT 1`,
      ).get(options.frameworkVersion) as { code?: string } | undefined
    : db.prepare(
        `SELECT code FROM nist_framework_versions
         WHERE status = 'active'
         ORDER BY created_at DESC
         LIMIT 1`,
      ).get() as { code?: string } | undefined;

  if (!framework?.code) {
    throw new Error('NIST CSF configuration is not initialized.');
  }

  const version = options?.questionnaireVersion
    ? db.prepare(
        `SELECT questionnaire_version
         FROM nist_questions
         WHERE framework_version = ? AND questionnaire_version = ?
         GROUP BY questionnaire_version
         LIMIT 1`,
      ).get(framework.code, options.questionnaireVersion) as
        | { questionnaire_version?: string }
        | undefined
    : db.prepare(
        `SELECT questionnaire_version
         FROM nist_questions
         WHERE framework_version = ? AND active = 1
         GROUP BY questionnaire_version
         ORDER BY MAX(updated_at) DESC
         LIMIT 1`,
      ).get(framework.code) as { questionnaire_version?: string } | undefined;

  if (!version?.questionnaire_version) {
    throw new Error('NIST questionnaire version is not configured.');
  }

  const functions = (db.prepare(
    `SELECT code, name, description, weight, sort_order
     FROM nist_functions
     WHERE framework_version = ? AND is_active = 1
     ORDER BY sort_order, code`,
  ).all(framework.code) as any[]).map((row) => ({
    code: String(row.code),
    name: String(row.name),
    description: String(row.description),
    weight: num(row.weight, 1),
    sortOrder: num(row.sort_order),
  }));

  const categories = (db.prepare(
    `SELECT code, function_code, name, description, weight, target_score, sort_order
     FROM nist_categories
     WHERE framework_version = ? AND is_active = 1
     ORDER BY sort_order, code`,
  ).all(framework.code) as any[]).map((row) => ({
    code: String(row.code),
    functionCode: String(row.function_code),
    name: String(row.name),
    description: String(row.description),
    weight: num(row.weight, 1),
    targetScore: num(row.target_score, 75),
    sortOrder: num(row.sort_order),
  }));

  const questions = (db.prepare(
    `SELECT id, function_code, category_code, question_code, question_text_en,
            question_text_id, help_text, executive_explanation, technical_explanation,
            weight, question_type, is_core, estimated_seconds, risk_signal, sort_order, version
     FROM nist_questions
     WHERE framework_version = ? AND questionnaire_version = ? AND active = 1
     ORDER BY sort_order, question_code`,
  ).all(framework.code, version.questionnaire_version) as any[]).map((row) => ({
    id: String(row.id),
    functionCode: String(row.function_code),
    categoryCode: String(row.category_code),
    questionCode: String(row.question_code),
    textEn: String(row.question_text_en),
    textId: String(row.question_text_id),
    helpText: String(row.help_text || ''),
    executiveExplanation: String(row.executive_explanation || ''),
    technicalExplanation: String(row.technical_explanation || ''),
    weight: num(row.weight, 1),
    questionType: String(row.question_type || 'scale'),
    isCore: bool(row.is_core),
    estimatedSeconds: num(row.estimated_seconds, 12),
    riskSignal: String(row.risk_signal || ''),
    sortOrder: num(row.sort_order),
    version: String(row.version),
  }));

  const answerOptions = (db.prepare(
    `SELECT value, label, description, score, verification_required, sort_order
     FROM nist_answer_options
     WHERE active = 1
     ORDER BY sort_order, value`,
  ).all() as any[]).map((row) => ({
    value: String(row.value),
    label: String(row.label),
    description: String(row.description),
    score: num(row.score),
    verificationRequired: bool(row.verification_required),
    sortOrder: num(row.sort_order),
  }));

  const evidenceOptions = (db.prepare(
    `SELECT value, label, multiplier, sort_order
     FROM nist_evidence_options
     WHERE active = 1
     ORDER BY sort_order, value`,
  ).all() as any[]).map((row) => ({
    value: String(row.value),
    label: String(row.label),
    multiplier: num(row.multiplier, 0.4),
    sortOrder: num(row.sort_order),
  }));

  const scoringThresholds = (db.prepare(
    `SELECT key, min_score, max_score, label, sort_order
     FROM nist_scoring_thresholds
     WHERE active = 1
     ORDER BY sort_order, min_score`,
  ).all() as any[]).map((row) => ({
    key: String(row.key),
    minScore: num(row.min_score),
    maxScore: num(row.max_score, 100),
    label: String(row.label),
    sortOrder: num(row.sort_order),
  }));

  const tierRules = (db.prepare(
    `SELECT tier, label, min_overall, min_govern, min_confidence
     FROM nist_tier_rules
     WHERE active = 1
     ORDER BY tier`,
  ).all() as any[]).map((row) => ({
    tier: num(row.tier, 1) as 1 | 2 | 3 | 4,
    label: String(row.label),
    minOverall: num(row.min_overall),
    minGovern: num(row.min_govern),
    minConfidence: num(row.min_confidence),
  }));

  const serviceMappings = (db.prepare(
    `SELECT id, category_code, service_code, service_name, service_url,
            reason_template, priority_order
     FROM nist_service_mappings
     WHERE active = 1
     ORDER BY category_code, priority_order, service_name`,
  ).all() as any[]).map((row) => ({
    id: String(row.id),
    categoryCode: String(row.category_code),
    serviceCode: String(row.service_code),
    serviceName: String(row.service_name),
    serviceUrl: String(row.service_url),
    reasonTemplate: String(row.reason_template),
    priorityOrder: num(row.priority_order, 100),
  }));

  return {
    frameworkVersion: framework.code,
    questionnaireVersion: version.questionnaire_version,
    scoringModelVersion: SCORING_MODEL_VERSION,
    recommendationVersion: RECOMMENDATION_VERSION,
    functions,
    categories,
    questions,
    answerOptions,
    evidenceOptions,
    scoringThresholds,
    tierRules,
    serviceMappings,
  };
}

export function createNistAssessment(params: {
  organization: NistOrganizationProfile;
  respondent: NistRespondentProfile;
  assessmentType: NistAssessmentType;
  consentVersion: string;
  organizationId?: string;
}): { assessment: NistAssessmentRecord; accessToken: string } {
  const config = getNistAssessmentConfig();
  const db = getDatabase();
  const id = randomUUID();
  const accessToken = randomBytes(32).toString('base64url');
  const accessTokenHash = hashAccessToken(accessToken);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO nist_assessments (
      id, access_token_hash, organization_id, company_name, industry, company_size,
      employee_count, it_user_count, country, region, location_count, website,
      technology_context_json, respondent_name, respondent_title, respondent_department,
      respondent_email, respondent_phone, consent_version, consent_at,
      assessment_type, framework_version, questionnaire_version,
      scoring_model_version, recommendation_version, status,
      started_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', ?, ?, ?)`,
  ).run(
    id,
    accessTokenHash,
    params.organizationId || null,
    params.organization.companyName,
    params.organization.industry,
    params.organization.companySize,
    params.organization.employeeCount ?? null,
    params.organization.itUserCount ?? null,
    params.organization.country || null,
    params.organization.region || null,
    params.organization.locationCount ?? null,
    params.organization.website || null,
    JSON.stringify(params.organization.technologyContext || {}),
    params.respondent.name,
    params.respondent.title || null,
    params.respondent.department || null,
    params.respondent.email,
    params.respondent.phone || null,
    params.consentVersion,
    now,
    params.assessmentType,
    config.frameworkVersion,
    config.questionnaireVersion,
    config.scoringModelVersion,
    config.recommendationVersion,
    now,
    now,
    now,
  );

  writeNistAudit({
    actor: params.respondent.email,
    action: 'assessment.started',
    resourceType: 'nist_assessment',
    resourceId: id,
    after: {
      assessmentType: params.assessmentType,
      frameworkVersion: config.frameworkVersion,
      questionnaireVersion: config.questionnaireVersion,
    },
  });

  return { assessment: getNistAssessment(id), accessToken };
}

export function verifyNistAssessmentToken(id: string, token: string | undefined | null) {
  if (!id || !token) return false;
  const db = getDatabase();
  const row = db.prepare(
    'SELECT access_token_hash FROM nist_assessments WHERE id = ?',
  ).get(id) as { access_token_hash?: string } | undefined;
  if (!row?.access_token_hash) return false;

  const expected = Buffer.from(String(row.access_token_hash), 'utf8');
  const actual = Buffer.from(hashAccessToken(token), 'utf8');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function getNistAssessment(id: string): NistAssessmentRecord {
  const db = getDatabase();
  const row = db.prepare(
    `SELECT * FROM nist_assessments WHERE id = ?`,
  ).get(id) as any;

  if (!row) throw new Error('Assessment not found.');

  let technologyContext: Record<string, boolean> = {};
  try {
    technologyContext = JSON.parse(String(row.technology_context_json || '{}'));
  } catch {
    technologyContext = {};
  }

  return {
    id: String(row.id),
    organizationId: row.organization_id ? String(row.organization_id) : null,
    assessmentType: row.assessment_type === 'detailed' ? 'detailed' : 'quick',
    frameworkVersion: String(row.framework_version),
    questionnaireVersion: String(row.questionnaire_version),
    scoringModelVersion: String(row.scoring_model_version),
    recommendationVersion: String(row.recommendation_version),
    status: row.status,
    organization: {
      companyName: String(row.company_name),
      industry: String(row.industry),
      companySize: String(row.company_size),
      employeeCount: row.employee_count == null ? null : num(row.employee_count),
      itUserCount: row.it_user_count == null ? null : num(row.it_user_count),
      country: String(row.country || ''),
      region: String(row.region || ''),
      locationCount: row.location_count == null ? null : num(row.location_count),
      website: String(row.website || ''),
      technologyContext,
    },
    respondent: {
      name: String(row.respondent_name),
      title: String(row.respondent_title || ''),
      department: String(row.respondent_department || ''),
      email: String(row.respondent_email),
      phone: String(row.respondent_phone || ''),
    },
    overallScore: row.overall_score == null ? null : num(row.overall_score),
    riskRating: row.risk_rating == null ? null : String(row.risk_rating),
    confidenceScore: row.confidence_score == null ? null : num(row.confidence_score),
    indicativeTier: row.indicative_tier == null ? null : num(row.indicative_tier),
    startedAt: String(row.started_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

export function saveNistAnswer(
  assessmentId: string,
  input: NistAnswerInput,
): NistAnswerRecord {
  const db = getDatabase();
  const assessment = getNistAssessment(assessmentId);
  if (assessment.status !== 'in_progress') {
    throw new Error('Completed assessments cannot be modified.');
  }

  const question = db.prepare(
    `SELECT id FROM nist_questions
     WHERE id = ? AND framework_version = ? AND questionnaire_version = ? AND active = 1`,
  ).get(
    input.questionId,
    assessment.frameworkVersion,
    assessment.questionnaireVersion,
  ) as { id?: string } | undefined;

  if (!question?.id) throw new Error('Question is not valid for this assessment.');

  const option = db.prepare(
    `SELECT value, score, verification_required
     FROM nist_answer_options
     WHERE value = ? AND active = 1`,
  ).get(input.answerValue) as
    | { value: string; score: number; verification_required: number }
    | undefined;

  if (!option) throw new Error('Answer option is not valid.');

  const evidence = input.evidenceStatus || 'unspecified';
  const validEvidence = db.prepare(
    `SELECT value FROM nist_evidence_options WHERE value = ? AND active = 1`,
  ).get(evidence) as { value?: string } | undefined;

  if (!validEvidence?.value) throw new Error('Evidence status is not valid.');

  const now = new Date().toISOString();
  const comment = String(input.comment || '').trim().slice(0, 2000);

  db.prepare(
    `INSERT INTO nist_answers (
      assessment_id, question_id, answer_value, answer_score, not_sure,
      evidence_status, comment, answered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(assessment_id, question_id) DO UPDATE SET
      answer_value = excluded.answer_value,
      answer_score = excluded.answer_score,
      not_sure = excluded.not_sure,
      evidence_status = excluded.evidence_status,
      comment = excluded.comment,
      answered_at = excluded.answered_at`,
  ).run(
    assessmentId,
    input.questionId,
    option.value,
    num(option.score),
    bool(option.verification_required) ? 1 : 0,
    evidence,
    comment || null,
    now,
  );

  db.prepare(
    'UPDATE nist_assessments SET updated_at = ? WHERE id = ?',
  ).run(now, assessmentId);

  return {
    questionId: input.questionId,
    answerValue: option.value,
    answerScore: num(option.score),
    notSure: bool(option.verification_required),
    evidenceStatus: evidence as any,
    comment,
    answeredAt: now,
  };
}

export function listNistAnswers(assessmentId: string): NistAnswerRecord[] {
  const db = getDatabase();
  return (db.prepare(
    `SELECT question_id, answer_value, answer_score, not_sure,
            evidence_status, comment, answered_at
     FROM nist_answers
     WHERE assessment_id = ?
     ORDER BY answered_at, question_id`,
  ).all(assessmentId) as any[]).map((row) => ({
    questionId: String(row.question_id),
    answerValue: String(row.answer_value),
    answerScore: num(row.answer_score),
    notSure: bool(row.not_sure),
    evidenceStatus: String(row.evidence_status || 'unspecified') as any,
    comment: String(row.comment || ''),
    answeredAt: String(row.answered_at),
  }));
}

export function persistNistResult(
  assessmentId: string,
  result: NistAssessmentResult,
): NistAssessmentResult {
  const db = getDatabase();
  const now = new Date().toISOString();
  const assessment = getNistAssessment(assessmentId);

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare('DELETE FROM nist_function_scores WHERE assessment_id = ?').run(assessmentId);
    db.prepare('DELETE FROM nist_category_scores WHERE assessment_id = ?').run(assessmentId);
    db.prepare('DELETE FROM nist_risk_findings WHERE assessment_id = ?').run(assessmentId);
    db.prepare('DELETE FROM nist_recommendations WHERE assessment_id = ?').run(assessmentId);
    db.prepare('DELETE FROM nist_roadmap_items WHERE assessment_id = ?').run(assessmentId);

    const insertFunction = db.prepare(
      `INSERT INTO nist_function_scores(
        assessment_id, function_code, function_name, score, target_score, gap
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const item of result.functionScores) {
      insertFunction.run(
        assessmentId,
        item.functionCode,
        item.functionName,
        item.score,
        item.targetScore,
        item.gap,
      );
    }

    const insertCategory = db.prepare(
      `INSERT INTO nist_category_scores(
        assessment_id, category_code, category_name, function_code,
        score, target_score, gap, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const item of result.categoryScores) {
      insertCategory.run(
        assessmentId,
        item.categoryCode,
        item.categoryName,
        item.functionCode,
        item.score,
        item.targetScore,
        item.gap,
        item.status,
      );
    }

    const insertFinding = db.prepare(
      `INSERT INTO nist_risk_findings(
        id, assessment_id, category_code, title, rating,
        likelihood, impact, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const item of result.findings) {
      insertFinding.run(
        item.id,
        assessmentId,
        item.categoryCode,
        item.title,
        item.rating,
        item.likelihood,
        item.impact,
        item.reason,
        now,
      );
    }

    const insertRecommendation = db.prepare(
      `INSERT INTO nist_recommendations(
        id, assessment_id, category_code, title, priority, effort, impact,
        suggested_timeline, reason, service_code, service_name, service_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const item of result.recommendations) {
      insertRecommendation.run(
        item.id,
        assessmentId,
        item.categoryCode,
        item.title,
        item.priority,
        item.effort,
        item.impact,
        item.suggestedTimeline,
        item.reason,
        item.serviceCode || null,
        item.serviceName || null,
        item.serviceUrl || null,
        now,
      );
    }

    const insertRoadmap = db.prepare(
      `INSERT INTO nist_roadmap_items(
        id, assessment_id, phase, category_code, action, reason, priority,
        owner_suggestion, dependencies, estimated_effort, expected_outcome, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const item of result.roadmap) {
      insertRoadmap.run(
        item.id,
        assessmentId,
        item.phase,
        item.categoryCode,
        item.action,
        item.reason,
        item.priority,
        item.ownerSuggestion,
        item.dependencies,
        item.estimatedEffort,
        item.expectedOutcome,
        now,
      );
    }

    db.prepare(
      `UPDATE nist_assessments
       SET status = 'completed', overall_score = ?, risk_rating = ?,
           confidence_score = ?, indicative_tier = ?, completed_at = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      result.overallScore,
      result.riskRating,
      result.confidenceScore,
      result.indicativeTier.tier,
      now,
      now,
      assessmentId,
    );

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  writeNistAudit({
    actor: assessment.respondent.email,
    action: 'assessment.completed',
    resourceType: 'nist_assessment',
    resourceId: assessmentId,
    after: {
      overallScore: result.overallScore,
      riskRating: result.riskRating,
      confidenceScore: result.confidenceScore,
      indicativeTier: result.indicativeTier.tier,
    },
  });

  return result;
}

export function getStoredNistResult(assessmentId: string): NistAssessmentResult {
  const db = getDatabase();
  const assessment = getNistAssessment(assessmentId);
  if (assessment.status === 'in_progress' || assessment.overallScore == null) {
    throw new Error('Assessment has not been completed.');
  }

  const functionScores = (db.prepare(
    `SELECT function_code, function_name, score, target_score, gap
     FROM nist_function_scores WHERE assessment_id = ?
     ORDER BY rowid`,
  ).all(assessmentId) as any[]).map((row) => ({
    functionCode: String(row.function_code),
    functionName: String(row.function_name),
    score: num(row.score),
    targetScore: num(row.target_score),
    gap: num(row.gap),
  }));

  const categoryScores = (db.prepare(
    `SELECT category_code, category_name, function_code, score, target_score, gap, status
     FROM nist_category_scores WHERE assessment_id = ?
     ORDER BY rowid`,
  ).all(assessmentId) as any[]).map((row) => ({
    categoryCode: String(row.category_code),
    categoryName: String(row.category_name),
    functionCode: String(row.function_code),
    score: num(row.score),
    targetScore: num(row.target_score),
    gap: num(row.gap),
    status: String(row.status),
  }));

  const findings = (db.prepare(
    `SELECT id, category_code, title, rating, likelihood, impact, reason
     FROM nist_risk_findings WHERE assessment_id = ?
     ORDER BY likelihood * impact DESC, category_code`,
  ).all(assessmentId) as any[]).map((row) => ({
    id: String(row.id),
    categoryCode: String(row.category_code),
    title: String(row.title),
    rating: row.rating,
    likelihood: num(row.likelihood),
    impact: num(row.impact),
    reason: String(row.reason),
  }));

  const recommendations = (db.prepare(
    `SELECT id, category_code, title, priority, effort, impact,
            suggested_timeline, reason, service_code, service_name, service_url
     FROM nist_recommendations WHERE assessment_id = ?
     ORDER BY rowid`,
  ).all(assessmentId) as any[]).map((row) => ({
    id: String(row.id),
    categoryCode: String(row.category_code),
    title: String(row.title),
    priority: row.priority,
    effort: row.effort,
    impact: row.impact,
    suggestedTimeline: row.suggested_timeline,
    reason: String(row.reason),
    serviceCode: row.service_code ? String(row.service_code) : undefined,
    serviceName: row.service_name ? String(row.service_name) : undefined,
    serviceUrl: row.service_url ? String(row.service_url) : undefined,
  }));

  const roadmap = (db.prepare(
    `SELECT id, phase, category_code, action, reason, priority,
            owner_suggestion, dependencies, estimated_effort, expected_outcome
     FROM nist_roadmap_items WHERE assessment_id = ?
     ORDER BY rowid`,
  ).all(assessmentId) as any[]).map((row) => ({
    id: String(row.id),
    phase: row.phase,
    categoryCode: String(row.category_code),
    action: String(row.action),
    reason: String(row.reason),
    priority: row.priority,
    ownerSuggestion: String(row.owner_suggestion),
    dependencies: String(row.dependencies),
    estimatedEffort: row.estimated_effort,
    expectedOutcome: String(row.expected_outcome),
  }));

  const strengths = [...categoryScores].sort((a, b) => b.score - a.score).slice(0, 5);
  const gaps = [...categoryScores].sort((a, b) => b.gap - a.gap).slice(0, 5);
  const strongestFunction = [...functionScores].sort((a, b) => b.score - a.score)[0];
  const weakestFunction = [...functionScores].sort((a, b) => a.score - b.score)[0];

  const config = getNistAssessmentConfig();
  const tierRule = config.tierRules.find((item) => item.tier === assessment.indicativeTier)
    || config.tierRules[0];

  return {
    assessmentId,
    overallScore: num(assessment.overallScore),
    riskRating: String(assessment.riskRating || ''),
    confidenceScore: num(assessment.confidenceScore),
    indicativeTier: {
      tier: (assessment.indicativeTier || 1) as 1 | 2 | 3 | 4,
      label: tierRule?.label || 'Partial',
    },
    completion: 100,
    strongestFunction,
    weakestFunction,
    criticalGapCount: categoryScores.filter((item) => item.status === 'Critical').length,
    functionScores,
    categoryScores,
    findings,
    recommendations,
    roadmap,
    strengths,
    gaps,
    benchmark: null,
    methodologyDisclaimer:
      'RTI NIST Cyber Quick Check is an independent diagnostic aligned with NIST CSF 2.0. It is not an official NIST certification, audit, accreditation, endorsement, or guarantee of compliance.',
  };
}

export function writeNistAudit(params: {
  actor: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  userAgent?: string;
  before?: unknown;
  after?: unknown;
}) {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO nist_audit_logs(
      actor, action, resource_type, resource_id, user_agent,
      before_json, after_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    String(params.actor || 'system').slice(0, 240),
    params.action,
    params.resourceType,
    params.resourceId || null,
    params.userAgent ? params.userAgent.slice(0, 500) : null,
    params.before === undefined ? null : JSON.stringify(params.before),
    params.after === undefined ? null : JSON.stringify(params.after),
    new Date().toISOString(),
  );
}

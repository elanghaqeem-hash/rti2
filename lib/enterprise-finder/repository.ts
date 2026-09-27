import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  DatabaseUnavailableError,
  getDatabase,
} from '@/lib/server/database';
import type {
  FinderAssessmentInput,
  FinderConfig,
  FinderDiagnosticResult,
  FinderLocale,
  FinderQuestion,
  FinderQuestionOption,
  FinderService,
  FinderServiceMapping,
} from '@/lib/enterprise-finder/types';

type QuestionRow = {
  question_key: string;
  step: number;
  category: string;
  question_type: FinderQuestion['type'];
  label_id: string;
  label_en: string;
  description_id: string | null;
  description_en: string | null;
  required: number;
  condition_json: string | null;
  weight: number;
  sort_order: number;
  version: number;
};

type OptionRow = {
  question_key: string;
  value: string;
  label_id: string;
  label_en: string;
  description_id: string | null;
  description_en: string | null;
  metadata_json: string | null;
  score: number;
  sort_order: number;
};

type ServiceRow = {
  service_key: string;
  category: string;
  name_id: string;
  name_en: string;
  description_id: string;
  description_en: string;
  url: string;
  delivery_model: string;
  typical_duration: string;
  complexity: FinderService['complexity'];
  priority_weight: number;
  diagnostic_tool_slug: string | null;
  outcomes_json: string;
  version: number;
};

type MappingRow = {
  service_key: string;
  dimension_type: FinderServiceMapping['dimensionType'];
  dimension_value: string;
  weight: number;
  rationale_id: string | null;
  rationale_en: string | null;
  version: number;
};

export class FinderDatabaseUnavailableError extends Error {
  constructor(message = 'Enterprise Solution Finder database is not available or not initialized.') {
    super(message);
    this.name = 'FinderDatabaseUnavailableError';
  }
}

function db() {
  try {
    return getDatabase();
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      throw new FinderDatabaseUnavailableError(error.message);
    }
    throw error;
  }
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function localize(locale: FinderLocale, id: string | null, en: string | null) {
  if (locale === 'en') return en || id || '';
  return id || en || '';
}

function hashToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function assertAssessmentToken(assessmentId: string, token: string) {
  const database = db();
  const row = database
    .prepare(
      'SELECT resume_token_hash FROM enterprise_finder_assessments WHERE id = ?',
    )
    .get(assessmentId) as { resume_token_hash?: string } | undefined;

  if (!row?.resume_token_hash || row.resume_token_hash !== hashToken(token)) {
    throw new Error('invalid-assessment-token');
  }
}

function currentVersion(table: string, column = 'version') {
  const allowed = new Set([
    'enterprise_finder_questions',
    'enterprise_finder_service_mappings',
    'enterprise_finder_ai_prompts',
    'enterprise_finder_scoring_weights',
  ]);
  if (!allowed.has(table)) return 1;

  const row = db()
    .prepare(`SELECT COALESCE(MAX(${column}), 1) AS version FROM ${table}`)
    .get() as { version?: number } | undefined;

  return Number(row?.version || 1);
}

export function getFinderConfig(locale: FinderLocale): FinderConfig {
  try {
    const database = db();
    const questionRows = database
      .prepare(
        `SELECT
          question_key, step, category, question_type,
          label_id, label_en, description_id, description_en,
          required, condition_json, weight, sort_order, version
        FROM enterprise_finder_questions
        WHERE is_active = 1
        ORDER BY step, sort_order, question_key`,
      )
      .all() as QuestionRow[];

    const optionRows = database
      .prepare(
        `SELECT
          question_key, value, label_id, label_en,
          description_id, description_en, metadata_json,
          score, sort_order
        FROM enterprise_finder_question_options
        WHERE is_active = 1
        ORDER BY question_key, sort_order, value`,
      )
      .all() as OptionRow[];

    const optionMap = new Map<string, FinderQuestionOption[]>();
    for (const row of optionRows) {
      const list = optionMap.get(row.question_key) || [];
      list.push({
        value: row.value,
        label: localize(locale, row.label_id, row.label_en),
        description:
          localize(locale, row.description_id, row.description_en) || undefined,
        score: Number(row.score || 0),
        sortOrder: Number(row.sort_order || 0),
        metadata: parseJson<Record<string, unknown>>(row.metadata_json, {}),
      });
      optionMap.set(row.question_key, list);
    }

    const questions: FinderQuestion[] = questionRows.map((row) => ({
      key: row.question_key,
      step: Math.min(4, Math.max(1, Number(row.step))) as 1 | 2 | 3 | 4,
      category: row.category,
      type: row.question_type,
      label: localize(locale, row.label_id, row.label_en),
      description:
        localize(locale, row.description_id, row.description_en) || undefined,
      required: Number(row.required) === 1,
      condition: parseJson<Record<string, unknown> | undefined>(
        row.condition_json,
        undefined,
      ),
      weight: Number(row.weight || 1),
      sortOrder: Number(row.sort_order || 0),
      version: Number(row.version || 1),
      options: optionMap.get(row.question_key) || [],
    }));

    return {
      locale,
      questionnaireVersion: currentVersion('enterprise_finder_questions'),
      scoringVersion: currentVersion('enterprise_finder_scoring_weights'),
      serviceMappingVersion: currentVersion('enterprise_finder_service_mappings'),
      aiPromptVersion: currentVersion('enterprise_finder_ai_prompts'),
      questions,
      capabilityStatuses: [
        {
          value: 'fully_implemented',
          label: locale === 'en' ? 'Fully Implemented' : 'Fully Implemented',
          gapScore: 0,
        },
        {
          value: 'partially_implemented',
          label: locale === 'en' ? 'Partially Implemented' : 'Partially Implemented',
          gapScore: 35,
        },
        {
          value: 'planned',
          label: locale === 'en' ? 'Planned' : 'Planned',
          gapScore: 55,
        },
        {
          value: 'unknown',
          label: locale === 'en' ? 'Unknown' : 'Unknown',
          gapScore: 65,
        },
        {
          value: 'not_implemented',
          label: locale === 'en' ? 'Not Implemented' : 'Not Implemented',
          gapScore: 85,
        },
      ],
    };
  } catch (error) {
    if (error instanceof FinderDatabaseUnavailableError) throw error;
    throw new FinderDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Finder configuration query failed.',
    );
  }
}

export function getFinderEngineData(locale: FinderLocale) {
  try {
    const database = db();
    const serviceRows = database
      .prepare(
        `SELECT
          service_key, category, name_id, name_en,
          description_id, description_en, url,
          delivery_model, typical_duration, complexity,
          priority_weight, diagnostic_tool_slug, outcomes_json, version
        FROM enterprise_finder_services
        WHERE is_active = 1
        ORDER BY priority_weight DESC, service_key`,
      )
      .all() as ServiceRow[];

    const mappingRows = database
      .prepare(
        `SELECT
          service_key, dimension_type, dimension_value, weight,
          rationale_id, rationale_en, version
        FROM enterprise_finder_service_mappings
        WHERE is_active = 1
        ORDER BY service_key, dimension_type, dimension_value`,
      )
      .all() as MappingRow[];

    const weights = Object.fromEntries(
      (
        database
          .prepare(
            `SELECT weight_key, weight_value
             FROM enterprise_finder_scoring_weights
             WHERE is_active = 1`,
          )
          .all() as Array<{ weight_key: string; weight_value: number }>
      ).map((row) => [row.weight_key, Number(row.weight_value)]),
    ) as Record<string, number>;

    const promptRow = database
      .prepare(
        `SELECT prompt_text, version
         FROM enterprise_finder_ai_prompts
         WHERE prompt_key = 'executive_summary' AND is_active = 1
         ORDER BY version DESC
         LIMIT 1`,
      )
      .get() as { prompt_text?: string; version?: number } | undefined;

    const services: FinderService[] = serviceRows.map((row) => ({
      key: row.service_key,
      category: row.category,
      name: localize(locale, row.name_id, row.name_en),
      description: localize(locale, row.description_id, row.description_en),
      url: row.url,
      deliveryModel: row.delivery_model,
      typicalDuration: row.typical_duration,
      complexity: row.complexity,
      priorityWeight: Number(row.priority_weight || 0),
      diagnosticToolSlug: row.diagnostic_tool_slug || undefined,
      outcomes: parseJson<string[]>(row.outcomes_json, []),
      version: Number(row.version || 1),
    }));

    const mappings: FinderServiceMapping[] = mappingRows.map((row) => ({
      serviceKey: row.service_key,
      dimensionType: row.dimension_type,
      dimensionValue: row.dimension_value,
      weight: Number(row.weight || 0),
      rationale:
        localize(locale, row.rationale_id, row.rationale_en) || undefined,
      version: Number(row.version || 1),
    }));

    return {
      services,
      mappings,
      weights,
      aiPrompt: promptRow?.prompt_text || '',
      aiPromptVersion: Number(promptRow?.version || 1),
    };
  } catch (error) {
    if (error instanceof FinderDatabaseUnavailableError) throw error;
    throw new FinderDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Finder engine configuration query failed.',
    );
  }
}

export function createFinderAssessmentSession(params: {
  locale: FinderLocale;
  questionnaireVersion: number;
  scoringVersion: number;
  serviceMappingVersion: number;
  aiPromptVersion: number;
}) {
  try {
    const database = db();
    const id = randomUUID();
    const token = randomBytes(32).toString('base64url');
    const now = new Date().toISOString();

    database
      .prepare(
        `INSERT INTO enterprise_finder_assessments (
          id, resume_token_hash, created_at, updated_at, status, locale,
          questionnaire_version, scoring_version, service_mapping_version, ai_prompt_version
        ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        hashToken(token),
        now,
        now,
        params.locale,
        params.questionnaireVersion,
        params.scoringVersion,
        params.serviceMappingVersion,
        params.aiPromptVersion,
      );

    database
      .prepare(
        `INSERT INTO enterprise_finder_events (
          id, assessment_id, event_type, event_payload_json, created_at
        ) VALUES (?, ?, 'assessment_started', NULL, ?)`,
      )
      .run(randomUUID(), id, now);

    return { id, token, createdAt: now };
  } catch (error) {
    if (error instanceof FinderDatabaseUnavailableError) throw error;
    throw new FinderDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Unable to create assessment session.',
    );
  }
}

export function saveFinderDraft(
  assessmentId: string,
  token: string,
  input: Partial<FinderAssessmentInput>,
) {
  assertAssessmentToken(assessmentId, token);

  try {
    const database = db();
    const now = new Date().toISOString();
    const rows: Array<[string, unknown]> = [
      ['organization', input.organization],
      ['technology', input.technology],
      ['pressures', input.pressures],
      ['trigger_answers', input.triggerAnswers],
      ['objectives', input.objectives],
      ['target_timeline', input.targetTimeline],
      ['delivery_preference', input.deliveryPreference],
    ].filter((entry) => entry[1] !== undefined) as Array<[string, unknown]>;

    database.exec('BEGIN IMMEDIATE;');
    try {
      const statement = database.prepare(
        `INSERT INTO enterprise_finder_answers (
          assessment_id, question_key, answer_json, updated_at
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(assessment_id, question_key) DO UPDATE SET
          answer_json = excluded.answer_json,
          updated_at = excluded.updated_at`,
      );

      for (const [key, value] of rows) {
        statement.run(assessmentId, key, JSON.stringify(value), now);
      }

      const organization = input.organization;
      const technology = input.technology;

      database
        .prepare(
          `UPDATE enterprise_finder_assessments SET
            updated_at = ?,
            organization_name = COALESCE(?, organization_name),
            industry = COALESCE(?, industry),
            organization_scale = COALESCE(?, organization_scale),
            digital_dependency = COALESCE(?, digital_dependency),
            timeline = COALESCE(?, timeline),
            delivery_preference = COALESCE(?, delivery_preference)
          WHERE id = ?`,
        )
        .run(
          now,
          organization?.companyName || null,
          organization?.industry || null,
          organization?.organizationScale || null,
          technology?.digitalDependency || null,
          input.targetTimeline || null,
          input.deliveryPreference || null,
          assessmentId,
        );

      database.exec('COMMIT;');
    } catch (error) {
      database.exec('ROLLBACK;');
      throw error;
    }

    return { savedAt: now };
  } catch (error) {
    if (error instanceof FinderDatabaseUnavailableError) throw error;
    throw new FinderDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Unable to save assessment draft.',
    );
  }
}

export function completeFinderAssessment(
  assessmentId: string,
  token: string,
  input: FinderAssessmentInput,
  result: FinderDiagnosticResult,
) {
  assertAssessmentToken(assessmentId, token);

  try {
    saveFinderDraft(assessmentId, token, input);

    const database = db();
    const now = new Date().toISOString();

    database.exec('BEGIN IMMEDIATE;');
    try {
      database
        .prepare(
          `UPDATE enterprise_finder_assessments SET
            updated_at = ?,
            completed_at = ?,
            status = 'completed',
            organization_name = ?,
            industry = ?,
            organization_scale = ?,
            digital_dependency = ?,
            timeline = ?,
            delivery_preference = ?,
            complexity = ?,
            result_json = ?
          WHERE id = ?`,
        )
        .run(
          now,
          now,
          input.organization.companyName || null,
          input.organization.industry,
          input.organization.organizationScale,
          input.technology.digitalDependency,
          input.targetTimeline,
          input.deliveryPreference,
          result.engagementComplexity,
          JSON.stringify({ ...result, assessmentId }),
          assessmentId,
        );

      database
        .prepare(
          'DELETE FROM enterprise_finder_recommendations WHERE assessment_id = ?',
        )
        .run(assessmentId);

      const insertRecommendation = database.prepare(
        `INSERT INTO enterprise_finder_recommendations (
          id, assessment_id, service_key, match_score, priority, reason,
          delivery_model, typical_duration, complexity, rank_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      [...result.primarySolutions, ...result.supportingSolutions].forEach(
        (recommendation, index) => {
          insertRecommendation.run(
            randomUUID(),
            assessmentId,
            recommendation.serviceKey,
            recommendation.matchScore,
            recommendation.priority,
            recommendation.reason,
            recommendation.deliveryModel,
            recommendation.typicalDuration,
            recommendation.complexity,
            index + 1,
            now,
          );
        },
      );

      database
        .prepare(
          `INSERT INTO enterprise_finder_events (
            id, assessment_id, event_type, event_payload_json, created_at
          ) VALUES (?, ?, 'assessment_completed', ?, ?)`,
        )
        .run(
          randomUUID(),
          assessmentId,
          JSON.stringify({
            enterprisePressureScore: result.enterprisePressureScore,
            complexity: result.engagementComplexity,
            topServices: result.primarySolutions.map((item) => item.serviceKey),
          }),
          now,
        );

      database.exec('COMMIT;');
    } catch (error) {
      database.exec('ROLLBACK;');
      throw error;
    }

    return { completedAt: now };
  } catch (error) {
    if (
      error instanceof FinderDatabaseUnavailableError ||
      (error instanceof Error && error.message === 'invalid-assessment-token')
    ) {
      throw error;
    }
    throw new FinderDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Unable to complete assessment.',
    );
  }
}

export function getFinderDraft(
  assessmentId: string,
  token: string,
): {
  status: 'draft' | 'completed';
  locale: FinderLocale;
  input: Partial<FinderAssessmentInput>;
  updatedAt: string;
} {
  assertAssessmentToken(assessmentId, token);

  try {
    const database = db();
    const assessment = database
      .prepare(
        `SELECT status, locale, updated_at
         FROM enterprise_finder_assessments
         WHERE id = ?`,
      )
      .get(assessmentId) as
      | { status?: 'draft' | 'completed'; locale?: FinderLocale; updated_at?: string }
      | undefined;

    if (!assessment?.status) {
      throw new Error('assessment-not-found');
    }

    const rows = database
      .prepare(
        `SELECT question_key, answer_json
         FROM enterprise_finder_answers
         WHERE assessment_id = ?`,
      )
      .all(assessmentId) as Array<{ question_key: string; answer_json: string }>;

    const answers = Object.fromEntries(
      rows.map((row) => [
        row.question_key,
        parseJson<unknown>(row.answer_json, null),
      ]),
    );

    return {
      status: assessment.status,
      locale: assessment.locale === 'en' ? 'en' : 'id',
      input: {
        locale: assessment.locale === 'en' ? 'en' : 'id',
        organization: answers.organization as FinderAssessmentInput['organization'] | undefined,
        technology: answers.technology as FinderAssessmentInput['technology'] | undefined,
        pressures: answers.pressures as FinderAssessmentInput['pressures'] | undefined,
        triggerAnswers: answers.trigger_answers as FinderAssessmentInput['triggerAnswers'] | undefined,
        objectives: answers.objectives as FinderAssessmentInput['objectives'] | undefined,
        targetTimeline: answers.target_timeline as string | undefined,
        deliveryPreference: answers.delivery_preference as string | undefined,
      },
      updatedAt: assessment.updated_at || new Date(0).toISOString(),
    };
  } catch (error) {
    if (
      error instanceof FinderDatabaseUnavailableError ||
      (error instanceof Error &&
        ['invalid-assessment-token', 'assessment-not-found'].includes(error.message))
    ) {
      throw error;
    }
    throw new FinderDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Unable to load assessment draft.',
    );
  }
}

export function getFinderAssessmentResult(
  assessmentId: string,
  token: string,
): FinderDiagnosticResult | null {
  assertAssessmentToken(assessmentId, token);

  try {
    const row = db()
      .prepare(
        `SELECT result_json
         FROM enterprise_finder_assessments
         WHERE id = ? AND status = 'completed'`,
      )
      .get(assessmentId) as { result_json?: string | null } | undefined;

    if (!row?.result_json) return null;
    return parseJson<FinderDiagnosticResult | null>(row.result_json, null);
  } catch (error) {
    if (error instanceof FinderDatabaseUnavailableError) throw error;
    throw new FinderDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Unable to load assessment result.',
    );
  }
}

export function recordFinderEvent(
  assessmentId: string | null,
  eventType: string,
  payload?: Record<string, unknown>,
) {
  try {
    db()
      .prepare(
        `INSERT INTO enterprise_finder_events (
          id, assessment_id, event_type, event_payload_json, created_at
        ) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        assessmentId,
        eventType.slice(0, 100),
        payload ? JSON.stringify(payload) : null,
        new Date().toISOString(),
      );
  } catch {
    // Analytics events must never break the customer journey.
  }
}

export function getFinderAnalytics() {
  try {
    const database = db();
    const totals = database
      .prepare(
        `SELECT
          COUNT(*) AS assessments,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
        FROM enterprise_finder_assessments`,
      )
      .get() as { assessments?: number; completed?: number } | undefined;

    const industries = database
      .prepare(
        `SELECT industry AS key, COUNT(*) AS count
         FROM enterprise_finder_assessments
         WHERE industry IS NOT NULL
         GROUP BY industry
         ORDER BY count DESC
         LIMIT 12`,
      )
      .all() as Array<{ key: string; count: number }>;

    const services = database
      .prepare(
        `SELECT
          r.service_key AS key,
          s.name_en AS name,
          COUNT(*) AS count,
          ROUND(AVG(r.match_score), 0) AS avg_score
        FROM enterprise_finder_recommendations r
        JOIN enterprise_finder_services s ON s.service_key = r.service_key
        GROUP BY r.service_key, s.name_en
        ORDER BY count DESC, avg_score DESC
        LIMIT 12`,
      )
      .all() as Array<{ key: string; name: string; count: number; avg_score: number }>;

    const events = database
      .prepare(
        `SELECT event_type AS key, COUNT(*) AS count
         FROM enterprise_finder_events
         GROUP BY event_type
         ORDER BY count DESC`,
      )
      .all() as Array<{ key: string; count: number }>;

    const assessments = Number(totals?.assessments || 0);
    const completed = Number(totals?.completed || 0);

    return {
      assessments,
      completed,
      completionRate: assessments ? Math.round((completed / assessments) * 100) : 0,
      industries,
      recommendedServices: services,
      events,
    };
  } catch (error) {
    if (error instanceof FinderDatabaseUnavailableError) throw error;
    throw new FinderDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Unable to load finder analytics.',
    );
  }
}

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  getRuntimeDatabase,
  RuntimeDatabaseUnavailableError,
  type RuntimeDatabase,
  type SqlValue,
} from '@/lib/server/runtime-database';
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

export class FinderRuntimeDatabaseUnavailableError extends Error {
  constructor(
    message = 'Enterprise Solution Finder database is unavailable or not initialized.',
  ) {
    super(message);
    this.name = 'FinderRuntimeDatabaseUnavailableError';
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

async function db() {
  try {
    return await getRuntimeDatabase();
  } catch (error) {
    if (error instanceof RuntimeDatabaseUnavailableError) {
      throw new FinderRuntimeDatabaseUnavailableError(error.message);
    }
    throw error;
  }
}

async function currentVersion(
  database: RuntimeDatabase,
  table: string,
  column = 'version',
) {
  const allowed = new Set([
    'enterprise_finder_questions',
    'enterprise_finder_service_mappings',
    'enterprise_finder_ai_prompts',
    'enterprise_finder_scoring_weights',
  ]);
  if (!allowed.has(table) || column !== 'version') return 1;

  const row = await database.queryOne<{ version?: number }>(
    `SELECT COALESCE(MAX(${column}), 1) AS version FROM ${table}`,
  );
  return Number(row?.version || 1);
}

async function assertAssessmentToken(
  database: RuntimeDatabase,
  assessmentId: string,
  token: string,
) {
  const row = await database.queryOne<{ resume_token_hash?: string }>(
    'SELECT resume_token_hash FROM enterprise_finder_assessments WHERE id = ?',
    [assessmentId],
  );

  if (!row?.resume_token_hash || row.resume_token_hash !== hashToken(token)) {
    throw new Error('invalid-assessment-token');
  }
}

export async function getFinderConfigRuntime(
  locale: FinderLocale,
): Promise<FinderConfig> {
  try {
    const database = await db();
    const [questionRows, optionRows, questionnaireVersion, scoringVersion, serviceMappingVersion, aiPromptVersion] =
      await Promise.all([
        database.queryAll<QuestionRow>(
          `SELECT
            question_key, step, category, question_type,
            label_id, label_en, description_id, description_en,
            required, condition_json, weight, sort_order, version
          FROM enterprise_finder_questions
          WHERE is_active = 1
          ORDER BY step, sort_order, question_key`,
        ),
        database.queryAll<OptionRow>(
          `SELECT
            question_key, value, label_id, label_en,
            description_id, description_en, metadata_json,
            score, sort_order
          FROM enterprise_finder_question_options
          WHERE is_active = 1
          ORDER BY question_key, sort_order, value`,
        ),
        currentVersion(database, 'enterprise_finder_questions'),
        currentVersion(database, 'enterprise_finder_scoring_weights'),
        currentVersion(database, 'enterprise_finder_service_mappings'),
        currentVersion(database, 'enterprise_finder_ai_prompts'),
      ]);

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

    if (questions.length === 0) {
      throw new FinderRuntimeDatabaseUnavailableError(
        'Enterprise Solution Finder master questions are not initialized.',
      );
    }

    return {
      locale,
      questionnaireVersion,
      scoringVersion,
      serviceMappingVersion,
      aiPromptVersion,
      questions,
      capabilityStatuses: [
        {
          value: 'fully_implemented',
          label: 'Fully Implemented',
          gapScore: 0,
        },
        {
          value: 'partially_implemented',
          label: 'Partially Implemented',
          gapScore: 35,
        },
        { value: 'planned', label: 'Planned', gapScore: 55 },
        { value: 'unknown', label: 'Unknown', gapScore: 65 },
        {
          value: 'not_implemented',
          label: 'Not Implemented',
          gapScore: 85,
        },
      ],
    };
  } catch (error) {
    if (error instanceof FinderRuntimeDatabaseUnavailableError) throw error;
    throw new FinderRuntimeDatabaseUnavailableError(
      error instanceof Error
        ? error.message
        : 'Finder configuration query failed.',
    );
  }
}

export async function getFinderEngineDataRuntime(locale: FinderLocale) {
  try {
    const database = await db();
    const [serviceRows, mappingRows, weightRows, promptRow] = await Promise.all([
      database.queryAll<ServiceRow>(
        `SELECT
          service_key, category, name_id, name_en,
          description_id, description_en, url,
          delivery_model, typical_duration, complexity,
          priority_weight, diagnostic_tool_slug, outcomes_json, version
        FROM enterprise_finder_services
        WHERE is_active = 1
        ORDER BY priority_weight DESC, service_key`,
      ),
      database.queryAll<MappingRow>(
        `SELECT
          service_key, dimension_type, dimension_value, weight,
          rationale_id, rationale_en, version
        FROM enterprise_finder_service_mappings
        WHERE is_active = 1
        ORDER BY service_key, dimension_type, dimension_value`,
      ),
      database.queryAll<{ weight_key: string; weight_value: number }>(
        `SELECT weight_key, weight_value
         FROM enterprise_finder_scoring_weights
         WHERE is_active = 1`,
      ),
      database.queryOne<{ prompt_text?: string; version?: number }>(
        `SELECT prompt_text, version
         FROM enterprise_finder_ai_prompts
         WHERE prompt_key = 'executive_summary' AND is_active = 1
         ORDER BY version DESC
         LIMIT 1`,
      ),
    ]);

    if (serviceRows.length === 0 || mappingRows.length === 0) {
      throw new FinderRuntimeDatabaseUnavailableError(
        'Enterprise Solution Finder service mappings are not initialized.',
      );
    }

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
      weights: Object.fromEntries(
        weightRows.map((row) => [
          row.weight_key,
          Number(row.weight_value || 0),
        ]),
      ) as Record<string, number>,
      aiPrompt: promptRow?.prompt_text || '',
      aiPromptVersion: Number(promptRow?.version || 1),
    };
  } catch (error) {
    if (error instanceof FinderRuntimeDatabaseUnavailableError) throw error;
    throw new FinderRuntimeDatabaseUnavailableError(
      error instanceof Error
        ? error.message
        : 'Finder engine configuration query failed.',
    );
  }
}

export async function createFinderAssessmentSessionRuntime(params: {
  locale: FinderLocale;
  questionnaireVersion: number;
  scoringVersion: number;
  serviceMappingVersion: number;
  aiPromptVersion: number;
}) {
  try {
    const database = await db();
    const id = randomUUID();
    const token = randomBytes(32).toString('base64url');
    const now = new Date().toISOString();

    await database.batch([
      {
        sql: `INSERT INTO enterprise_finder_assessments (
          id, resume_token_hash, created_at, updated_at, status, locale,
          questionnaire_version, scoring_version, service_mapping_version, ai_prompt_version
        ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
        params: [
          id,
          hashToken(token),
          now,
          now,
          params.locale,
          params.questionnaireVersion,
          params.scoringVersion,
          params.serviceMappingVersion,
          params.aiPromptVersion,
        ],
      },
      {
        sql: `INSERT INTO enterprise_finder_events (
          id, assessment_id, event_type, event_payload_json, created_at
        ) VALUES (?, ?, 'assessment_started', NULL, ?)`,
        params: [randomUUID(), id, now],
      },
    ]);

    return { id, token, createdAt: now };
  } catch (error) {
    if (error instanceof FinderRuntimeDatabaseUnavailableError) throw error;
    throw new FinderRuntimeDatabaseUnavailableError(
      error instanceof Error
        ? error.message
        : 'Unable to create assessment session.',
    );
  }
}

export async function saveFinderDraftRuntime(
  assessmentId: string,
  token: string,
  input: Partial<FinderAssessmentInput>,
) {
  const database = await db();
  await assertAssessmentToken(database, assessmentId, token);

  try {
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

    const statements: Array<{ sql: string; params?: SqlValue[] }> = rows.map(
      ([key, value]) => ({
        sql: `INSERT INTO enterprise_finder_answers (
          assessment_id, question_key, answer_json, updated_at
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(assessment_id, question_key) DO UPDATE SET
          answer_json = excluded.answer_json,
          updated_at = excluded.updated_at`,
        params: [assessmentId, key, JSON.stringify(value), now],
      }),
    );

    const organization = input.organization;
    const technology = input.technology;

    statements.push({
      sql: `UPDATE enterprise_finder_assessments SET
        updated_at = ?,
        organization_name = COALESCE(?, organization_name),
        industry = COALESCE(?, industry),
        organization_scale = COALESCE(?, organization_scale),
        digital_dependency = COALESCE(?, digital_dependency),
        timeline = COALESCE(?, timeline),
        delivery_preference = COALESCE(?, delivery_preference)
      WHERE id = ?`,
      params: [
        now,
        organization?.companyName || null,
        organization?.industry || null,
        organization?.organizationScale || null,
        technology?.digitalDependency || null,
        input.targetTimeline || null,
        input.deliveryPreference || null,
        assessmentId,
      ],
    });

    await database.batch(statements);
    return { savedAt: now };
  } catch (error) {
    if (error instanceof FinderRuntimeDatabaseUnavailableError) throw error;
    throw new FinderRuntimeDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Unable to save assessment draft.',
    );
  }
}

export async function getFinderDraftRuntime(
  assessmentId: string,
  token: string,
): Promise<{
  status: 'draft' | 'completed';
  locale: FinderLocale;
  input: Partial<FinderAssessmentInput>;
  updatedAt: string;
}> {
  const database = await db();
  await assertAssessmentToken(database, assessmentId, token);

  const assessment = await database.queryOne<{
    status?: 'draft' | 'completed';
    locale?: FinderLocale;
    updated_at?: string;
  }>(
    `SELECT status, locale, updated_at
     FROM enterprise_finder_assessments
     WHERE id = ?`,
    [assessmentId],
  );

  if (!assessment?.status) throw new Error('assessment-not-found');

  const rows = await database.queryAll<{
    question_key: string;
    answer_json: string;
  }>(
    `SELECT question_key, answer_json
     FROM enterprise_finder_answers
     WHERE assessment_id = ?`,
    [assessmentId],
  );

  const answers = Object.fromEntries(
    rows.map((row) => [
      row.question_key,
      parseJson<unknown>(row.answer_json, null),
    ]),
  );

  const locale: FinderLocale = assessment.locale === 'en' ? 'en' : 'id';

  return {
    status: assessment.status,
    locale,
    input: {
      locale,
      organization: answers.organization as
        | FinderAssessmentInput['organization']
        | undefined,
      technology: answers.technology as
        | FinderAssessmentInput['technology']
        | undefined,
      pressures: answers.pressures as
        | FinderAssessmentInput['pressures']
        | undefined,
      triggerAnswers: answers.trigger_answers as
        | FinderAssessmentInput['triggerAnswers']
        | undefined,
      objectives: answers.objectives as
        | FinderAssessmentInput['objectives']
        | undefined,
      targetTimeline: answers.target_timeline as string | undefined,
      deliveryPreference: answers.delivery_preference as string | undefined,
    },
    updatedAt: assessment.updated_at || new Date(0).toISOString(),
  };
}

export async function completeFinderAssessmentRuntime(
  assessmentId: string,
  token: string,
  input: FinderAssessmentInput,
  result: FinderDiagnosticResult,
) {
  const database = await db();
  await assertAssessmentToken(database, assessmentId, token);
  await saveFinderDraftRuntime(assessmentId, token, input);

  try {
    const now = new Date().toISOString();
    const statements: Array<{ sql: string; params?: SqlValue[] }> = [
      {
        sql: `UPDATE enterprise_finder_assessments SET
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
        params: [
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
        ],
      },
      {
        sql: 'DELETE FROM enterprise_finder_recommendations WHERE assessment_id = ?',
        params: [assessmentId],
      },
    ];

    [...result.primarySolutions, ...result.supportingSolutions].forEach(
      (recommendation, index) => {
        statements.push({
          sql: `INSERT INTO enterprise_finder_recommendations (
            id, assessment_id, service_key, match_score, priority, reason,
            delivery_model, typical_duration, complexity, rank_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params: [
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
          ],
        });
      },
    );

    statements.push({
      sql: `INSERT INTO enterprise_finder_events (
        id, assessment_id, event_type, event_payload_json, created_at
      ) VALUES (?, ?, 'assessment_completed', ?, ?)`,
      params: [
        randomUUID(),
        assessmentId,
        JSON.stringify({
          enterprisePressureScore: result.enterprisePressureScore,
          complexity: result.engagementComplexity,
          topServices: result.primarySolutions.map((item) => item.serviceKey),
        }),
        now,
      ],
    });

    await database.batch(statements);
    return { completedAt: now };
  } catch (error) {
    if (error instanceof FinderRuntimeDatabaseUnavailableError) throw error;
    throw new FinderRuntimeDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Unable to complete assessment.',
    );
  }
}

export async function getFinderAssessmentResultRuntime(
  assessmentId: string,
  token: string,
): Promise<FinderDiagnosticResult | null> {
  const database = await db();
  await assertAssessmentToken(database, assessmentId, token);

  const row = await database.queryOne<{ result_json?: string | null }>(
    `SELECT result_json
     FROM enterprise_finder_assessments
     WHERE id = ? AND status = 'completed'`,
    [assessmentId],
  );

  if (!row?.result_json) return null;
  return parseJson<FinderDiagnosticResult | null>(row.result_json, null);
}

export async function recordFinderEventRuntime(
  assessmentId: string | null,
  eventType: string,
  payload?: Record<string, unknown>,
) {
  try {
    const database = await db();
    await database.run(
      `INSERT INTO enterprise_finder_events (
        id, assessment_id, event_type, event_payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        assessmentId,
        eventType.slice(0, 100),
        payload ? JSON.stringify(payload) : null,
        new Date().toISOString(),
      ],
    );
  } catch {
    // Analytics must not interrupt the customer journey.
  }
}

export async function getFinderAnalyticsRuntime() {
  try {
    const database = await db();
    const [totals, industries, services, events] = await Promise.all([
      database.queryOne<{ assessments?: number; completed?: number }>(
        `SELECT
          COUNT(*) AS assessments,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
        FROM enterprise_finder_assessments`,
      ),
      database.queryAll<{ key: string; count: number }>(
        `SELECT industry AS key, COUNT(*) AS count
         FROM enterprise_finder_assessments
         WHERE industry IS NOT NULL
         GROUP BY industry
         ORDER BY count DESC
         LIMIT 12`,
      ),
      database.queryAll<{
        key: string;
        name: string;
        count: number;
        avg_score: number;
      }>(
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
      ),
      database.queryAll<{ key: string; count: number }>(
        `SELECT event_type AS key, COUNT(*) AS count
         FROM enterprise_finder_events
         GROUP BY event_type
         ORDER BY count DESC`,
      ),
    ]);

    const assessments = Number(totals?.assessments || 0);
    const completed = Number(totals?.completed || 0);

    return {
      assessments,
      completed,
      completionRate: assessments
        ? Math.round((completed / assessments) * 100)
        : 0,
      industries,
      recommendedServices: services,
      events,
    };
  } catch (error) {
    if (error instanceof FinderRuntimeDatabaseUnavailableError) throw error;
    throw new FinderRuntimeDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Unable to load finder analytics.',
    );
  }
}

import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { getDatabase } from '@/lib/server/database';
import {
  getNistAssessmentConfig,
  writeNistAudit,
} from '@/lib/nist/repository';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

function unauthorized() {
  return NextResponse.json(
    { success: false, error: 'Admin authentication required.' },
    { status: 401, headers: NO_STORE },
  );
}

function text(value: unknown, max: number, required = false) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (required && !normalized) throw new Error('required');
  return normalized.slice(0, max);
}

function numberValue(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error('number');
  }
  return parsed;
}

function booleanValue(value: unknown) {
  if (value === true || value === false) return value;
  throw new Error('boolean');
}

function adminActor(req: Request) {
  return 'RTI Admin';
}

function getAdminDashboard() {
  const db = getDatabase();
  const config = getNistAssessmentConfig();

  const stats = db.prepare(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
      AVG(CASE WHEN status <> 'in_progress' THEN overall_score END) AS average_score,
      SUM(CASE WHEN status <> 'in_progress' AND risk_rating IN ('Critical Exposure','High Risk') THEN 1 ELSE 0 END) AS elevated
     FROM nist_assessments`,
  ).get() as any;

  const assessments = db.prepare(
    `SELECT id, company_name, industry, company_size, respondent_name,
            respondent_email, assessment_type, status, overall_score,
            risk_rating, confidence_score, indicative_tier, started_at, completed_at
     FROM nist_assessments
     ORDER BY created_at DESC
     LIMIT 100`,
  ).all() as any[];

  const topGaps = db.prepare(
    `SELECT category_code, category_name, COUNT(*) AS assessments,
            ROUND(AVG(gap), 1) AS average_gap
     FROM nist_category_scores
     WHERE gap > 0
     GROUP BY category_code, category_name
     ORDER BY average_gap DESC, assessments DESC
     LIMIT 10`,
  ).all() as any[];

  const auditLogs = db.prepare(
    `SELECT id, actor, action, resource_type, resource_id, created_at
     FROM nist_audit_logs
     ORDER BY id DESC
     LIMIT 100`,
  ).all() as any[];

  return {
    config,
    stats: {
      total: Number(stats?.total || 0),
      completed: Number(stats?.completed || 0),
      inProgress: Number(stats?.in_progress || 0),
      averageScore:
        stats?.average_score == null ? null : Math.round(Number(stats.average_score)),
      elevated: Number(stats?.elevated || 0),
    },
    assessments,
    topGaps,
    auditLogs,
  };
}

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();

  try {
    return NextResponse.json(
      { success: true, ...getAdminDashboard() },
      { headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'NIST admin configuration is unavailable.',
      },
      { status: 503, headers: NO_STORE },
    );
  }
}

export async function PATCH(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, error: 'Invalid admin update payload.' },
      { status: 400, headers: NO_STORE },
    );
  }

  const value = body as Record<string, unknown>;
  const entity = text(value.entity, 40, true);
  const key = text(value.key, 160, true);
  const changes =
    value.changes && typeof value.changes === 'object' && !Array.isArray(value.changes)
      ? value.changes as Record<string, unknown>
      : {};

  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    let before: unknown = null;
    let after: unknown = null;

    if (entity === 'question') {
      before = db.prepare('SELECT * FROM nist_questions WHERE id = ?').get(key);
      if (!before) throw new Error('Question not found.');

      const current = before as any;
      const questionTextEn =
        changes.questionTextEn === undefined
          ? String(current.question_text_en)
          : text(changes.questionTextEn, 2000, true);
      const questionTextId =
        changes.questionTextId === undefined
          ? String(current.question_text_id)
          : text(changes.questionTextId, 2000, true);
      const helpText =
        changes.helpText === undefined
          ? String(current.help_text || '')
          : text(changes.helpText, 3000);
      const weight =
        changes.weight === undefined
          ? Number(current.weight)
          : numberValue(changes.weight, 0.1, 100);
      const estimatedSeconds =
        changes.estimatedSeconds === undefined
          ? Number(current.estimated_seconds)
          : Math.round(numberValue(changes.estimatedSeconds, 5, 600));
      const active =
        changes.active === undefined
          ? Number(current.active) === 1
          : booleanValue(changes.active);

      db.prepare(
        `UPDATE nist_questions
         SET question_text_en = ?, question_text_id = ?, help_text = ?,
             weight = ?, estimated_seconds = ?, active = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        questionTextEn,
        questionTextId,
        helpText || null,
        weight,
        estimatedSeconds,
        active ? 1 : 0,
        now,
        key,
      );
      after = db.prepare('SELECT * FROM nist_questions WHERE id = ?').get(key);
    } else if (entity === 'category') {
      const [frameworkVersion, categoryCode] = key.split('::');
      before = db.prepare(
        'SELECT * FROM nist_categories WHERE framework_version = ? AND code = ?',
      ).get(frameworkVersion, categoryCode);
      if (!before) throw new Error('Category not found.');

      const current = before as any;
      const weight =
        changes.weight === undefined
          ? Number(current.weight)
          : numberValue(changes.weight, 0.1, 100);
      const targetScore =
        changes.targetScore === undefined
          ? Number(current.target_score)
          : numberValue(changes.targetScore, 0, 100);
      const active =
        changes.active === undefined
          ? Number(current.is_active) === 1
          : booleanValue(changes.active);

      db.prepare(
        `UPDATE nist_categories
         SET weight = ?, target_score = ?, is_active = ?
         WHERE framework_version = ? AND code = ?`,
      ).run(weight, targetScore, active ? 1 : 0, frameworkVersion, categoryCode);
      after = db.prepare(
        'SELECT * FROM nist_categories WHERE framework_version = ? AND code = ?',
      ).get(frameworkVersion, categoryCode);
    } else if (entity === 'function') {
      const [frameworkVersion, functionCode] = key.split('::');
      before = db.prepare(
        'SELECT * FROM nist_functions WHERE framework_version = ? AND code = ?',
      ).get(frameworkVersion, functionCode);
      if (!before) throw new Error('Function not found.');

      const current = before as any;
      const weight =
        changes.weight === undefined
          ? Number(current.weight)
          : numberValue(changes.weight, 0.1, 100);
      const active =
        changes.active === undefined
          ? Number(current.is_active) === 1
          : booleanValue(changes.active);

      db.prepare(
        `UPDATE nist_functions SET weight = ?, is_active = ?
         WHERE framework_version = ? AND code = ?`,
      ).run(weight, active ? 1 : 0, frameworkVersion, functionCode);
      after = db.prepare(
        'SELECT * FROM nist_functions WHERE framework_version = ? AND code = ?',
      ).get(frameworkVersion, functionCode);
    } else if (entity === 'threshold') {
      before = db.prepare(
        'SELECT * FROM nist_scoring_thresholds WHERE key = ?',
      ).get(key);
      if (!before) throw new Error('Scoring threshold not found.');

      const current = before as any;
      const minScore =
        changes.minScore === undefined
          ? Number(current.min_score)
          : numberValue(changes.minScore, 0, 100);
      const maxScore =
        changes.maxScore === undefined
          ? Number(current.max_score)
          : numberValue(changes.maxScore, 0, 100);
      if (minScore > maxScore) throw new Error('Minimum score cannot exceed maximum score.');
      const label =
        changes.label === undefined
          ? String(current.label)
          : text(changes.label, 120, true);

      db.prepare(
        `UPDATE nist_scoring_thresholds
         SET min_score = ?, max_score = ?, label = ?
         WHERE key = ?`,
      ).run(minScore, maxScore, label, key);
      after = db.prepare(
        'SELECT * FROM nist_scoring_thresholds WHERE key = ?',
      ).get(key);
    } else if (entity === 'tier') {
      const tier = Math.round(numberValue(key, 1, 4));
      before = db.prepare('SELECT * FROM nist_tier_rules WHERE tier = ?').get(tier);
      if (!before) throw new Error('Tier rule not found.');

      const current = before as any;
      const minOverall =
        changes.minOverall === undefined
          ? Number(current.min_overall)
          : numberValue(changes.minOverall, 0, 100);
      const minGovern =
        changes.minGovern === undefined
          ? Number(current.min_govern)
          : numberValue(changes.minGovern, 0, 100);
      const minConfidence =
        changes.minConfidence === undefined
          ? Number(current.min_confidence)
          : numberValue(changes.minConfidence, 0, 100);
      const label =
        changes.label === undefined
          ? String(current.label)
          : text(changes.label, 120, true);

      db.prepare(
        `UPDATE nist_tier_rules
         SET label = ?, min_overall = ?, min_govern = ?, min_confidence = ?
         WHERE tier = ?`,
      ).run(label, minOverall, minGovern, minConfidence, tier);
      after = db.prepare('SELECT * FROM nist_tier_rules WHERE tier = ?').get(tier);
    } else if (entity === 'service') {
      before = db.prepare('SELECT * FROM nist_service_mappings WHERE id = ?').get(key);
      if (!before) throw new Error('Service mapping not found.');

      const current = before as any;
      const serviceName =
        changes.serviceName === undefined
          ? String(current.service_name)
          : text(changes.serviceName, 240, true);
      const serviceUrl =
        changes.serviceUrl === undefined
          ? String(current.service_url)
          : text(changes.serviceUrl, 500, true);
      const reasonTemplate =
        changes.reasonTemplate === undefined
          ? String(current.reason_template)
          : text(changes.reasonTemplate, 2000, true);
      const active =
        changes.active === undefined
          ? Number(current.active) === 1
          : booleanValue(changes.active);

      db.prepare(
        `UPDATE nist_service_mappings
         SET service_name = ?, service_url = ?, reason_template = ?, active = ?
         WHERE id = ?`,
      ).run(serviceName, serviceUrl, reasonTemplate, active ? 1 : 0, key);
      after = db.prepare('SELECT * FROM nist_service_mappings WHERE id = ?').get(key);
    } else {
      throw new Error('Unsupported NIST admin entity.');
    }

    writeNistAudit({
      actor: adminActor(req),
      action: `admin.${entity}.updated`,
      resourceType: `nist_${entity}`,
      resourceId: key,
      userAgent: req.headers.get('user-agent') || undefined,
      before,
      after,
    });

    return NextResponse.json(
      { success: true, entity, key, after, dashboard: getAdminDashboard() },
      { headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'NIST admin update failed.',
      },
      { status: 400, headers: NO_STORE },
    );
  }
}

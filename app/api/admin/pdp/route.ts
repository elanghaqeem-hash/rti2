import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { getDatabase } from '@/lib/server/database';
import { getPdpConfig, writePdpAudit } from '@/lib/pdp/repository';

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
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error('number');
  return parsed;
}

function booleanValue(value: unknown) {
  if (value === true || value === false) return value;
  if (value === 1 || value === 0) return value === 1;
  throw new Error('boolean');
}

function dashboard() {
  const db = getDatabase();
  const config = getPdpConfig();

  const stats = db.prepare(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
      AVG(CASE WHEN status = 'completed' THEN overall_score END) AS average_score,
      AVG(CASE WHEN status = 'completed' THEN evidence_score END) AS average_evidence
     FROM pdp_assessments`,
  ).get() as any;

  const assessments = db.prepare(
    `SELECT id,company_name,industry,company_size,respondent_name,respondent_email,
      assessment_type,status,overall_score,readiness_level,evidence_score,gates_completed,
      started_at,completed_at
     FROM pdp_assessments
     ORDER BY created_at DESC
     LIMIT 100`,
  ).all() as any[];

  const topGaps = db.prepare(
    `SELECT domain_code,severity,question_code,title,COUNT(*) AS occurrences
     FROM pdp_gap_findings
     GROUP BY domain_code,severity,question_code,title
     ORDER BY
       CASE severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
       occurrences DESC
     LIMIT 20`,
  ).all() as any[];

  const auditLogs = db.prepare(
    `SELECT id,actor,action,resource_type,resource_id,created_at
     FROM pdp_audit_logs
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
        stats?.average_score == null ? null : Math.round(Number(stats.average_score) * 10) / 10,
      averageEvidence:
        stats?.average_evidence == null ? null : Math.round(Number(stats.average_evidence) * 10) / 10,
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
      { success: true, dashboard: dashboard() },
      { headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'UU PDP admin configuration is unavailable.',
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
  const key = text(value.key, 180, true);
  const changes =
    value.changes && typeof value.changes === 'object' && !Array.isArray(value.changes)
      ? (value.changes as Record<string, unknown>)
      : {};

  const db = getDatabase();
  const timestamp = new Date().toISOString();

  try {
    let before: any = null;
    let after: any = null;

    if (entity === 'question') {
      before = db.prepare('SELECT * FROM pdp_questions WHERE id = ?').get(key);
      if (!before) throw new Error('Question not found.');

      const current = before as any;
      const questionText =
        changes.questionText === undefined
          ? String(current.question_text)
          : text(changes.questionText, 2500, true);
      const helpText =
        changes.helpText === undefined
          ? String(current.help_text || '')
          : text(changes.helpText, 3000);
      const expectedEvidence =
        changes.expectedEvidence === undefined
          ? String(current.expected_evidence || '')
          : text(changes.expectedEvidence, 3000);
      const riskIfMissing =
        changes.riskIfMissing === undefined
          ? String(current.risk_if_missing || '')
          : text(changes.riskIfMissing, 3000);
      const recommendation =
        changes.recommendation === undefined
          ? String(current.recommendation || '')
          : text(changes.recommendation, 3000);
      const legalReference =
        changes.legalReference === undefined
          ? String(current.legal_reference || '')
          : text(changes.legalReference, 500);
      const criticality =
        changes.criticality === undefined
          ? String(current.criticality)
          : text(changes.criticality, 20, true);
      if (!['Critical','High','Medium','Low'].includes(criticality)) {
        throw new Error('Invalid criticality.');
      }
      const weight =
        changes.weight === undefined
          ? Number(current.weight)
          : numberValue(changes.weight, 0.1, 100);
      const isCore =
        changes.isCore === undefined
          ? Number(current.is_core) === 1
          : booleanValue(changes.isCore);
      const active =
        changes.active === undefined
          ? Number(current.active) === 1
          : booleanValue(changes.active);

      db.prepare(
        `UPDATE pdp_questions SET
          question_text=?,help_text=?,expected_evidence=?,risk_if_missing=?,recommendation=?,
          legal_reference=?,criticality=?,weight=?,is_core=?,active=?,updated_at=?
         WHERE id=?`,
      ).run(
        questionText,
        helpText || null,
        expectedEvidence || null,
        riskIfMissing || null,
        recommendation || null,
        legalReference || null,
        criticality,
        weight,
        isCore ? 1 : 0,
        active ? 1 : 0,
        timestamp,
        key,
      );
      after = db.prepare('SELECT * FROM pdp_questions WHERE id = ?').get(key);
    } else if (entity === 'domain') {
      const [frameworkVersion, domainCode] = key.split('::');
      before = db.prepare(
        'SELECT * FROM pdp_domains WHERE framework_version = ? AND code = ?',
      ).get(frameworkVersion, domainCode);
      if (!before) throw new Error('Domain not found.');

      const current = before as any;
      const name =
        changes.name === undefined ? String(current.name) : text(changes.name, 180, true);
      const description =
        changes.description === undefined
          ? String(current.description)
          : text(changes.description, 1500, true);
      const weight =
        changes.weight === undefined
          ? Number(current.weight)
          : numberValue(changes.weight, 0.1, 100);
      const active =
        changes.active === undefined
          ? Number(current.is_active) === 1
          : booleanValue(changes.active);

      db.prepare(
        'UPDATE pdp_domains SET name=?,description=?,weight=?,is_active=? WHERE framework_version=? AND code=?',
      ).run(name, description, weight, active ? 1 : 0, frameworkVersion, domainCode);
      after = db.prepare(
        'SELECT * FROM pdp_domains WHERE framework_version = ? AND code = ?',
      ).get(frameworkVersion, domainCode);
    } else if (entity === 'answer-option') {
      before = db.prepare('SELECT * FROM pdp_answer_options WHERE value = ?').get(key);
      if (!before) throw new Error('Answer option not found.');
      const current = before as any;
      const label =
        changes.label === undefined ? String(current.label) : text(changes.label, 160, true);
      const description =
        changes.description === undefined
          ? String(current.description)
          : text(changes.description, 800, true);
      const score =
        changes.score === undefined
          ? current.score
          : changes.score === null
            ? null
            : numberValue(changes.score, 0, 100);
      const active =
        changes.active === undefined
          ? Number(current.active) === 1
          : booleanValue(changes.active);

      db.prepare(
        'UPDATE pdp_answer_options SET label=?,description=?,score=?,active=? WHERE value=?',
      ).run(label, description, score, active ? 1 : 0, key);
      after = db.prepare('SELECT * FROM pdp_answer_options WHERE value = ?').get(key);
    } else if (entity === 'evidence-option') {
      before = db.prepare('SELECT * FROM pdp_evidence_options WHERE value = ?').get(key);
      if (!before) throw new Error('Evidence option not found.');
      const current = before as any;
      const label =
        changes.label === undefined ? String(current.label) : text(changes.label, 160, true);
      const multiplier =
        changes.multiplier === undefined
          ? Number(current.multiplier)
          : numberValue(changes.multiplier, 0, 1);
      const active =
        changes.active === undefined
          ? Number(current.active) === 1
          : booleanValue(changes.active);

      db.prepare(
        'UPDATE pdp_evidence_options SET label=?,multiplier=?,active=? WHERE value=?',
      ).run(label, multiplier, active ? 1 : 0, key);
      after = db.prepare('SELECT * FROM pdp_evidence_options WHERE value = ?').get(key);
    } else if (entity === 'threshold') {
      before = db.prepare('SELECT * FROM pdp_scoring_thresholds WHERE key = ?').get(key);
      if (!before) throw new Error('Threshold not found.');
      const current = before as any;
      const minScore =
        changes.minScore === undefined
          ? Number(current.min_score)
          : numberValue(changes.minScore, 0, 100);
      const maxScore =
        changes.maxScore === undefined
          ? Number(current.max_score)
          : numberValue(changes.maxScore, 0, 100);
      if (minScore > maxScore) throw new Error('Minimum cannot exceed maximum.');
      const label =
        changes.label === undefined ? String(current.label) : text(changes.label, 160, true);

      db.prepare(
        'UPDATE pdp_scoring_thresholds SET min_score=?,max_score=?,label=? WHERE key=?',
      ).run(minScore, maxScore, label, key);
      after = db.prepare('SELECT * FROM pdp_scoring_thresholds WHERE key = ?').get(key);
    } else if (entity === 'scoring-weight') {
      before = db.prepare('SELECT * FROM pdp_scoring_weights WHERE key = ?').get(key);
      if (!before) throw new Error('Scoring weight not found.');
      const weight =
        changes.weight === undefined
          ? Number(before.weight)
          : numberValue(changes.weight, 0, 100);
      db.prepare('UPDATE pdp_scoring_weights SET weight=? WHERE key=?').run(weight, key);
      after = db.prepare('SELECT * FROM pdp_scoring_weights WHERE key = ?').get(key);
    } else if (entity === 'gate') {
      before = db.prepare('SELECT * FROM pdp_readiness_gates WHERE key = ?').get(key);
      if (!before) throw new Error('Readiness gate not found.');
      const current = before as any;
      const label =
        changes.label === undefined ? String(current.label) : text(changes.label, 160, true);
      const minimumScore =
        changes.minimumScore === undefined
          ? Number(current.minimum_score)
          : numberValue(changes.minimumScore, 0, 100);
      const evidenceMinimum =
        changes.evidenceMinimum === undefined
          ? String(current.evidence_minimum)
          : text(changes.evidenceMinimum, 80, true);
      const active =
        changes.active === undefined
          ? Number(current.active) === 1
          : booleanValue(changes.active);
      db.prepare(
        'UPDATE pdp_readiness_gates SET label=?,minimum_score=?,evidence_minimum=?,active=? WHERE key=?',
      ).run(label, minimumScore, evidenceMinimum, active ? 1 : 0, key);
      after = db.prepare('SELECT * FROM pdp_readiness_gates WHERE key = ?').get(key);
    } else if (entity === 'service') {
      before = db.prepare('SELECT * FROM pdp_service_mappings WHERE id = ?').get(key);
      if (!before) throw new Error('Service mapping not found.');
      const current = before as any;
      const serviceName =
        changes.serviceName === undefined
          ? String(current.service_name)
          : text(changes.serviceName, 240, true);
      const reasonTemplate =
        changes.reasonTemplate === undefined
          ? String(current.reason_template)
          : text(changes.reasonTemplate, 2000, true);
      const active =
        changes.active === undefined
          ? Number(current.active) === 1
          : booleanValue(changes.active);

      db.prepare(
        'UPDATE pdp_service_mappings SET service_name=?,reason_template=?,active=? WHERE id=?',
      ).run(serviceName, reasonTemplate, active ? 1 : 0, key);
      after = db.prepare('SELECT * FROM pdp_service_mappings WHERE id = ?').get(key);
    } else {
      throw new Error('Unsupported PDP admin entity.');
    }

    writePdpAudit({
      actor: 'RTI Admin',
      action: 'admin.' + entity + '.updated',
      resourceType: 'pdp_' + entity,
      resourceId: key,
      before,
      after,
    });

    return NextResponse.json(
      { success: true, entity, key, after, dashboard: dashboard() },
      { headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'PDP admin update failed.',
      },
      { status: 400, headers: NO_STORE },
    );
  }
}

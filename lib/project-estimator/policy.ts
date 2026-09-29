import { randomUUID } from 'node:crypto';
import { getRuntimeDatabase } from '@/lib/server/runtime-database';
import { computePricingBands } from '@/packages/engine/index.js';

export type EstimatorPolicyCandidate = {
  id?: string;
  version: string;
  floorMargin: number;
  premiumFactor: number;
  rushFactor: number;
  marketAdjustment: number;
  minMarginAlert: number;
  notes?: string;
};

type PolicyRow = {
  id: string;
  version: string;
  effective_from: string | null;
  effective_to: string | null;
  floor_margin: number;
  premium_factor: number;
  rush_factor: number;
  market_adjustment: number;
  min_margin_alert: number;
  status: 'draft' | 'active' | 'retired';
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function policyFromRow(row: PolicyRow) {
  return {
    id: row.id,
    version: row.version,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    floorMargin: Number(row.floor_margin),
    premiumFactor: Number(row.premium_factor),
    rushFactor: Number(row.rush_factor),
    marketAdjustment: Number(row.market_adjustment),
    minMarginAlert: Number(row.min_margin_alert),
    status: row.status,
    approvedBy: row.approved_by,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateCandidate(candidate: EstimatorPolicyCandidate) {
  const version = String(candidate.version || '').trim().slice(0, 40);
  if (!/^[A-Za-z0-9._-]+$/.test(version)) {
    throw new Error('Policy version may only contain letters, numbers, dot, underscore and dash.');
  }
  const numeric = {
    floorMargin: Number(candidate.floorMargin),
    premiumFactor: Number(candidate.premiumFactor),
    rushFactor: Number(candidate.rushFactor),
    marketAdjustment: Number(candidate.marketAdjustment),
    minMarginAlert: Number(candidate.minMarginAlert),
  };
  if (numeric.floorMargin < 0 || numeric.floorMargin > 0.8) throw new Error('Floor margin must be between 0 and 0.80.');
  if (numeric.premiumFactor < 1 || numeric.premiumFactor > 3) throw new Error('Premium factor must be between 1.00 and 3.00.');
  if (numeric.rushFactor < 1 || numeric.rushFactor > 3) throw new Error('Rush factor must be between 1.00 and 3.00.');
  if (numeric.marketAdjustment < 0.5 || numeric.marketAdjustment > 2) throw new Error('Market adjustment must be between 0.50 and 2.00.');
  if (numeric.minMarginAlert < 0 || numeric.minMarginAlert > 0.8) throw new Error('Minimum margin alert must be between 0 and 0.80.');
  return { version, ...numeric, notes: String(candidate.notes || '').trim().slice(0, 4000) };
}

async function audit(entityType: string, entityId: string, action: string, actor: string, before: unknown, after: unknown) {
  const db = await getRuntimeDatabase();
  await db.run(
    `INSERT INTO estimator_audit_logs
      (id,entity_type,entity_id,action,actor,before_json,after_json,created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      randomUUID(),
      entityType,
      entityId,
      action,
      actor,
      before == null ? null : JSON.stringify(before),
      after == null ? null : JSON.stringify(after),
      new Date().toISOString(),
    ],
  );
}

async function setting(key: string, fallback: string) {
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<{ value: string }>('SELECT value FROM estimator_settings WHERE key=?', [key]);
  return row?.value ?? fallback;
}

export async function getEstimatorPolicyGovernance() {
  const db = await getRuntimeDatabase();
  const [policies, segments, resources, approvalRules, decisions, simulations] = await Promise.all([
    db.queryAll<PolicyRow>(
      `SELECT id,version,effective_from,effective_to,floor_margin,premium_factor,rush_factor,
              market_adjustment,min_margin_alert,status,approved_by,notes,created_at,updated_at
       FROM estimator_policy_versions
       ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END, created_at DESC`,
    ),
    db.queryAll<any>(
      'SELECT code,name,multiplier,needs_calibration,updated_at FROM estimator_client_segments ORDER BY code',
    ),
    db.queryAll<any>(
      'SELECT id,role_key,name,internal_day_rate,is_active FROM resource_roles ORDER BY name',
    ),
    db.queryAll<any>(
      `SELECT id,rule_name,condition_json,approval_level,approver_role,sort_order,needs_calibration,is_active,updated_at
       FROM estimator_approval_rules_v2 ORDER BY sort_order,rule_name`,
    ),
    db.queryAll<any>(
      `SELECT code,title,status,decision_json,decided_by,decided_at,updated_at
       FROM estimator_go_live_decisions ORDER BY code`,
    ),
    db.queryAll<any>(
      `SELECT id,policy_version_id,candidate_json,sample_size,included_count,excluded_count,result_json,actor,created_at
       FROM estimator_policy_simulations ORDER BY created_at DESC LIMIT 20`,
    ),
  ]);

  return {
    policies: policies.map(policyFromRow),
    segments: segments.map((row) => ({
      code: row.code,
      name: row.name,
      multiplier: Number(row.multiplier),
      needsCalibration: Number(row.needs_calibration) === 1,
      updatedAt: row.updated_at,
    })),
    resources: resources.map((row) => ({
      id: row.id,
      roleKey: row.role_key,
      name: row.name,
      internalDayRate: row.internal_day_rate == null ? null : Number(row.internal_day_rate),
      active: Number(row.is_active) === 1,
      calibrated: Number(row.is_active) !== 1 || Number(row.internal_day_rate || 0) > 0,
    })),
    approvalRules: approvalRules.map((row) => ({
      id: row.id,
      name: row.rule_name,
      condition: JSON.parse(row.condition_json || '{}'),
      approvalLevel: row.approval_level,
      approverRole: row.approver_role,
      needsCalibration: Number(row.needs_calibration) === 1,
      active: Number(row.is_active) === 1,
      updatedAt: row.updated_at,
    })),
    decisions: decisions.map((row) => ({
      code: row.code,
      title: row.title,
      status: row.status,
      decision: row.decision_json ? JSON.parse(row.decision_json) : null,
      decidedBy: row.decided_by,
      decidedAt: row.decided_at,
      updatedAt: row.updated_at,
    })),
    simulations: simulations.map((row) => ({
      id: row.id,
      policyVersionId: row.policy_version_id,
      candidate: JSON.parse(row.candidate_json || '{}'),
      sampleSize: Number(row.sample_size),
      includedCount: Number(row.included_count),
      excludedCount: Number(row.excluded_count),
      result: JSON.parse(row.result_json || '{}'),
      actor: row.actor,
      createdAt: row.created_at,
    })),
  };
}

export async function saveEstimatorPolicyDraft(params: EstimatorPolicyCandidate & { actor: string }) {
  const db = await getRuntimeDatabase();
  const candidate = validateCandidate(params);
  const now = new Date().toISOString();
  const existing = params.id
    ? await db.queryOne<PolicyRow>(
        `SELECT id,version,effective_from,effective_to,floor_margin,premium_factor,rush_factor,
                market_adjustment,min_margin_alert,status,approved_by,notes,created_at,updated_at
         FROM estimator_policy_versions WHERE id=?`,
        [params.id],
      )
    : null;

  if (existing && existing.status !== 'draft') {
    throw new Error('Only draft policies can be edited. Clone an active or retired policy into a new version.');
  }
  const id = existing?.id || randomUUID();
  const duplicate = await db.queryOne<{ id: string }>(
    'SELECT id FROM estimator_policy_versions WHERE version=? AND id<>?',
    [candidate.version, id],
  );
  if (duplicate) throw new Error('Policy version already exists.');

  await db.run(
    `INSERT INTO estimator_policy_versions
      (id,version,effective_from,effective_to,floor_margin,premium_factor,rush_factor,
       market_adjustment,min_margin_alert,status,approved_by,notes,created_at,updated_at)
     VALUES (?,?,NULL,NULL,?,?,?,?,?,'draft',NULL,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       version=excluded.version,
       floor_margin=excluded.floor_margin,
       premium_factor=excluded.premium_factor,
       rush_factor=excluded.rush_factor,
       market_adjustment=excluded.market_adjustment,
       min_margin_alert=excluded.min_margin_alert,
       notes=excluded.notes,
       updated_at=excluded.updated_at`,
    [
      id,
      candidate.version,
      candidate.floorMargin,
      candidate.premiumFactor,
      candidate.rushFactor,
      candidate.marketAdjustment,
      candidate.minMarginAlert,
      candidate.notes || null,
      existing?.created_at || now,
      now,
    ],
  );

  await audit('estimator_policy', id, existing ? 'update_draft' : 'create_draft', params.actor, existing, candidate);
  return id;
}

export async function cloneEstimatorPolicy(params: { sourceId: string; version: string; actor: string }) {
  const db = await getRuntimeDatabase();
  const source = await db.queryOne<PolicyRow>(
    `SELECT id,version,effective_from,effective_to,floor_margin,premium_factor,rush_factor,
            market_adjustment,min_margin_alert,status,approved_by,notes,created_at,updated_at
     FROM estimator_policy_versions WHERE id=?`,
    [params.sourceId],
  );
  if (!source) throw new Error('Source policy not found.');
  return saveEstimatorPolicyDraft({
    version: params.version,
    floorMargin: Number(source.floor_margin),
    premiumFactor: Number(source.premium_factor),
    rushFactor: Number(source.rush_factor),
    marketAdjustment: Number(source.market_adjustment),
    minMarginAlert: Number(source.min_margin_alert),
    notes: `Cloned from ${source.version}. ${source.notes || ''}`.trim(),
    actor: params.actor,
  });
}

export async function updateEstimatorSegment(params: {
  code: string;
  multiplier: number;
  confirmed: boolean;
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const before = await db.queryOne<any>(
    'SELECT code,name,multiplier,needs_calibration FROM estimator_client_segments WHERE code=?',
    [params.code],
  );
  if (!before) throw new Error('Client segment not found.');
  const multiplier = Number(params.multiplier);
  if (!Number.isFinite(multiplier) || multiplier < 0.5 || multiplier > 3) {
    throw new Error('Segment multiplier must be between 0.50 and 3.00.');
  }
  await db.run(
    'UPDATE estimator_client_segments SET multiplier=?,needs_calibration=?,updated_at=? WHERE code=?',
    [multiplier, params.confirmed ? 0 : 1, new Date().toISOString(), params.code],
  );
  await audit('estimator_client_segment', params.code, 'update', params.actor, before, {
    multiplier,
    needsCalibration: !params.confirmed,
  });
}

export async function confirmEstimatorApprovalMatrix(params: { note: string; actor: string }) {
  const note = String(params.note || '').trim();
  if (note.length < 10) throw new Error('Provide a short management calibration note before confirming the approval matrix.');
  const db = await getRuntimeDatabase();
  const before = await db.queryAll<any>(
    'SELECT id,needs_calibration FROM estimator_approval_rules_v2 WHERE is_active=1',
  );
  await db.run(
    'UPDATE estimator_approval_rules_v2 SET needs_calibration=0,updated_at=? WHERE is_active=1',
    [new Date().toISOString()],
  );
  await audit('estimator_approval_rules', 'active', 'confirm_calibration', params.actor, before, { note });
}

export async function updateGoLiveDecision(params: {
  code: string;
  status: 'pending' | 'confirmed';
  decision: Record<string, unknown> | string;
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const before = await db.queryOne<any>('SELECT * FROM estimator_go_live_decisions WHERE code=?', [params.code]);
  if (!before) throw new Error('Go-live decision not found.');
  const decision =
    typeof params.decision === 'string'
      ? { note: params.decision.trim().slice(0, 4000) }
      : params.decision;
  if (params.status === 'confirmed' && !decision) throw new Error('Confirmed decisions require evidence or a decision note.');
  const now = new Date().toISOString();
  await db.run(
    `UPDATE estimator_go_live_decisions
     SET status=?,decision_json=?,decided_by=?,decided_at=?,updated_at=?
     WHERE code=?`,
    [
      params.status,
      decision ? JSON.stringify(decision) : null,
      params.status === 'confirmed' ? params.actor : null,
      params.status === 'confirmed' ? now : null,
      now,
      params.code,
    ],
  );
  await audit('estimator_go_live_decision', params.code, params.status, params.actor, before, decision);
}

async function resolvePolicyRow(candidate: EstimatorPolicyCandidate) {
  return validateCandidate(candidate);
}

export async function simulateEstimatorPolicy(params: {
  policyVersionId?: string;
  candidate: EstimatorPolicyCandidate;
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const candidate = await resolvePolicyRow(params.candidate);
  const requested = Math.max(
    1,
    Math.min(20, Number(await setting('policy_simulation_sample_size', '20')) || 20),
  );
  const baselineRow = await db.queryOne<PolicyRow>(
    `SELECT id,version,effective_from,effective_to,floor_margin,premium_factor,rush_factor,
            market_adjustment,min_margin_alert,status,approved_by,notes,created_at,updated_at
     FROM estimator_policy_versions
     ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END, created_at DESC
     LIMIT 1`,
  );
  if (!baselineRow) throw new Error('Baseline estimator policy is not configured.');
  const baseline = policyFromRow(baselineRow);
  const segments = await db.queryAll<{ code: string; multiplier: number }>(
    'SELECT code,multiplier FROM estimator_client_segments',
  );
  const segmentMap = new Map(segments.map((row) => [row.code, Number(row.multiplier)]));
  const sessions = await db.queryAll<any>(
    `SELECT pe.id AS estimate_id,pe.session_id,pe.created_at,es.project_name,s.name AS service_name,
            COALESCE(eq.segment_code,'STD') AS segment_code,
            COALESCE(
              eb.a_resource_cost + eb.b_commission_referral + eb.c_document_material + eb.d_third_party + eb.e_travel_accommodation,
              eq.internal_cost,
              0
            ) AS internal_cost
     FROM project_estimates pe
     JOIN estimator_sessions es ON es.id=pe.session_id
     JOIN services s ON s.id=pe.service_id
     LEFT JOIN estimator_boq_v2 eb ON eb.estimate_id=pe.id
     LEFT JOIN estimator_quotations eq ON eq.id=(
       SELECT q2.id FROM estimator_quotations q2
       WHERE q2.estimate_id=pe.id
       ORDER BY q2.created_at DESC LIMIT 1
     )
     WHERE pe.id=(
       SELECT pe2.id FROM project_estimates pe2
       WHERE pe2.session_id=pe.session_id
       ORDER BY pe2.version DESC, pe2.created_at DESC LIMIT 1
     )
     ORDER BY pe.created_at DESC
     LIMIT ?`,
    [requested],
  );

  let included = 0;
  let excluded = 0;
  let currentStandardTotal = 0;
  let candidateStandardTotal = 0;
  let currentFloorTotal = 0;
  let candidateFloorTotal = 0;
  const rows = sessions.map((row) => {
    const internalCost = Math.max(0, Number(row.internal_cost || 0));
    const segmentCode = String(row.segment_code || 'STD');
    const segmentMultiplier = segmentMap.get(segmentCode) ?? segmentMap.get('STD') ?? 1;
    if (internalCost <= 0) {
      excluded += 1;
      return {
        sessionId: row.session_id,
        estimateId: row.estimate_id,
        projectName: row.project_name,
        serviceName: row.service_name,
        segmentCode,
        internalCost: 0,
        included: false,
        reason: 'Internal BoQ / quotation cost is not available.',
      };
    }

    included += 1;
    const current = computePricingBands({
      internalCost,
      floorMargin: baseline.floorMargin,
      segmentMultiplier,
      marketAdjustment: baseline.marketAdjustment,
      premiumFactor: baseline.premiumFactor,
    });
    const next = computePricingBands({
      internalCost,
      floorMargin: candidate.floorMargin,
      segmentMultiplier,
      marketAdjustment: candidate.marketAdjustment,
      premiumFactor: candidate.premiumFactor,
    });
    currentStandardTotal += current.standard;
    candidateStandardTotal += next.standard;
    currentFloorTotal += current.floor;
    candidateFloorTotal += next.floor;
    return {
      sessionId: row.session_id,
      estimateId: row.estimate_id,
      projectName: row.project_name,
      serviceName: row.service_name,
      segmentCode,
      internalCost,
      included: true,
      current,
      candidate: next,
      standardDelta: next.standard - current.standard,
      standardDeltaPct: current.standard
        ? Math.round(((next.standard - current.standard) / current.standard) * 10000) / 100
        : 0,
    };
  });

  const result = {
    baseline: {
      policyId: baseline.id,
      version: baseline.version,
      floorMargin: baseline.floorMargin,
      premiumFactor: baseline.premiumFactor,
      marketAdjustment: baseline.marketAdjustment,
    },
    candidate,
    totals: {
      currentFloor: currentFloorTotal,
      candidateFloor: candidateFloorTotal,
      currentStandard: currentStandardTotal,
      candidateStandard: candidateStandardTotal,
      standardDelta: candidateStandardTotal - currentStandardTotal,
      standardDeltaPct: currentStandardTotal
        ? Math.round(((candidateStandardTotal - currentStandardTotal) / currentStandardTotal) * 10000) / 100
        : 0,
    },
    rows,
  };

  const id = randomUUID();
  await db.run(
    `INSERT INTO estimator_policy_simulations
      (id,policy_version_id,candidate_json,sample_size,included_count,excluded_count,result_json,actor,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      id,
      params.policyVersionId || null,
      JSON.stringify(candidate),
      sessions.length,
      included,
      excluded,
      JSON.stringify(result),
      params.actor,
      new Date().toISOString(),
    ],
  );
  await audit('estimator_policy_simulation', id, 'simulate', params.actor, null, {
    policyVersionId: params.policyVersionId || null,
    sampleSize: sessions.length,
    included,
    excluded,
    totals: result.totals,
  });

  return {
    id,
    sampleSize: sessions.length,
    includedCount: included,
    excludedCount: excluded,
    ...result,
  };
}

export async function runEstimatorPolicyPublishChecks(params: {
  policyVersionId: string;
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const policy = await db.queryOne<PolicyRow>(
    `SELECT id,version,effective_from,effective_to,floor_margin,premium_factor,rush_factor,
            market_adjustment,min_margin_alert,status,approved_by,notes,created_at,updated_at
     FROM estimator_policy_versions WHERE id=?`,
    [params.policyVersionId],
  );
  if (!policy) throw new Error('Policy version not found.');

  const checks: Array<{
    code: string;
    status: 'pass' | 'warn' | 'block';
    message: string;
    detail?: unknown;
  }> = [];

  checks.push({
    code: 'POLICY_DRAFT',
    status: policy.status === 'draft' ? 'pass' : 'block',
    message: policy.status === 'draft' ? 'Policy is in draft state.' : 'Only a draft policy can be published.',
  });

  try {
    validateCandidate({
      version: policy.version,
      floorMargin: Number(policy.floor_margin),
      premiumFactor: Number(policy.premium_factor),
      rushFactor: Number(policy.rush_factor),
      marketAdjustment: Number(policy.market_adjustment),
      minMarginAlert: Number(policy.min_margin_alert),
      notes: policy.notes || '',
    });
    checks.push({ code: 'POLICY_VALUES', status: 'pass', message: 'Policy numeric values are within configured safety bounds.' });
  } catch (error) {
    checks.push({
      code: 'POLICY_VALUES',
      status: 'block',
      message: error instanceof Error ? error.message : 'Policy numeric validation failed.',
    });
  }

  const uncalibratedRates = await db.queryAll<any>(
    'SELECT role_key,name,internal_day_rate FROM resource_roles WHERE is_active=1 AND (internal_day_rate IS NULL OR internal_day_rate<=0)',
  );
  const requireRates = (await setting('policy_publish_requires_calibrated_rates', 'true')).toLowerCase() !== 'false';
  checks.push({
    code: 'RATE_CARD',
    status: uncalibratedRates.length && requireRates ? 'block' : uncalibratedRates.length ? 'warn' : 'pass',
    message: uncalibratedRates.length
      ? `${uncalibratedRates.length} active rate-card role(s) are not calibrated.`
      : 'All active resource day rates are calibrated.',
    detail: uncalibratedRates.map((row) => ({ roleKey: row.role_key, name: row.name })),
  });

  const uncalibratedSegments = await db.queryAll<any>(
    'SELECT code,name,multiplier FROM estimator_client_segments WHERE needs_calibration=1',
  );
  checks.push({
    code: 'CLIENT_SEGMENTS',
    status: uncalibratedSegments.length ? 'block' : 'pass',
    message: uncalibratedSegments.length
      ? `${uncalibratedSegments.length} client segment multiplier(s) still require RTI calibration.`
      : 'Client segment multipliers are confirmed.',
    detail: uncalibratedSegments,
  });

  const uncalibratedApprovals = await db.queryAll<any>(
    'SELECT id,rule_name FROM estimator_approval_rules_v2 WHERE is_active=1 AND needs_calibration=1',
  );
  checks.push({
    code: 'APPROVAL_MATRIX',
    status: uncalibratedApprovals.length ? 'block' : 'pass',
    message: uncalibratedApprovals.length
      ? 'Approval matrix still contains seed values marked KALIBRASI RTI.'
      : 'Approval matrix is marked calibrated.',
    detail: uncalibratedApprovals,
  });

  const pendingDecisions = await db.queryAll<any>(
    "SELECT code,title FROM estimator_go_live_decisions WHERE status<>'confirmed' ORDER BY code",
  );
  checks.push({
    code: 'OPEN_DECISIONS',
    status: pendingDecisions.length ? 'block' : 'pass',
    message: pendingDecisions.length
      ? `${pendingDecisions.length} go-live decision(s) K-1–K-8 remain pending.`
      : 'All K-1–K-8 go-live decisions are confirmed.',
    detail: pendingDecisions,
  });

  const simulation = await db.queryOne<any>(
    `SELECT id,created_at,included_count,excluded_count FROM estimator_policy_simulations
     WHERE policy_version_id=? AND created_at>=?
     ORDER BY created_at DESC LIMIT 1`,
    [policy.id, policy.updated_at],
  );
  checks.push({
    code: 'POLICY_SIMULATION',
    status: simulation ? 'pass' : 'block',
    message: simulation
      ? `Policy has a post-update simulation with ${Number(simulation.included_count)} included session(s).`
      : 'Run a fresh 20-session policy simulation after the latest policy update before publishing.',
    detail: simulation || undefined,
  });

  const now = new Date().toISOString();
  await db.batch([
    {
      sql: 'DELETE FROM estimator_policy_publish_checks WHERE policy_version_id=?',
      params: [policy.id],
    },
    ...checks.map((check) => ({
      sql: `INSERT INTO estimator_policy_publish_checks
        (id,policy_version_id,check_code,status,message,detail_json,checked_by,checked_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      params: [
        randomUUID(),
        policy.id,
        check.code,
        check.status,
        check.message,
        check.detail == null ? null : JSON.stringify(check.detail),
        params.actor,
        now,
      ],
    })),
  ]);

  return {
    policy: policyFromRow(policy),
    checks,
    canPublish: checks.every((check) => check.status !== 'block'),
  };
}

export async function publishEstimatorPolicy(params: {
  policyVersionId: string;
  confirmation: string;
  actor: string;
}) {
  const expected = await setting('policy_publish_confirmation_phrase', 'PUBLISH RTI POLICY');
  if (String(params.confirmation || '').trim() !== expected) {
    throw new Error('Policy publish confirmation phrase does not match.');
  }

  const checkResult = await runEstimatorPolicyPublishChecks({
    policyVersionId: params.policyVersionId,
    actor: params.actor,
  });
  if (!checkResult.canPublish) {
    throw new Error('Policy cannot be published while blocking readiness checks remain.');
  }

  const db = await getRuntimeDatabase();
  const before = await db.queryOne<any>('SELECT * FROM estimator_policy_versions WHERE id=?', [params.policyVersionId]);
  if (!before || before.status !== 'draft') throw new Error('Only a draft policy can be published.');
  const now = new Date().toISOString();

  await db.batch([
    {
      sql: `UPDATE estimator_policy_versions
            SET status='retired',effective_to=?,updated_at=?
            WHERE status='active' AND id<>?`,
      params: [now, now, params.policyVersionId],
    },
    {
      sql: `UPDATE estimator_policy_versions
            SET status='active',effective_from=?,effective_to=NULL,approved_by=?,updated_at=?
            WHERE id=?`,
      params: [now, params.actor, now, params.policyVersionId],
    },
    {
      sql: `UPDATE estimator_settings SET value='APPROVED',updated_at=?
            WHERE key='estimator_calibration_status'`,
      params: [now],
    },
  ]);

  await audit('estimator_policy', params.policyVersionId, 'publish', params.actor, before, {
    status: 'active',
    effectiveFrom: now,
  });
  return { policyVersionId: params.policyVersionId, status: 'active', effectiveFrom: now };
}

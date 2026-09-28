import { randomUUID } from 'node:crypto';
import { getRuntimeDatabase } from '@/lib/server/runtime-database';
import { computePricingBands } from '@/packages/engine/index.js';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export async function getEstimatorPolicies() {
  const db = await getRuntimeDatabase();
  const [policies, segments] = await Promise.all([
    db.queryAll<any>(
      `SELECT id,version,effective_from,effective_to,floor_margin,premium_factor,rush_factor,
              market_adjustment,min_margin_alert,status,approved_by,notes,created_at,updated_at
       FROM estimator_policy_versions
       ORDER BY created_at DESC`,
    ),
    db.queryAll<any>(
      `SELECT code,name,multiplier,needs_calibration,updated_at
       FROM estimator_client_segments ORDER BY code`,
    ),
  ]);

  return {
    policies: policies.map((row) => ({
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
    })),
    segments: segments.map((row) => ({
      code: row.code,
      name: row.name,
      multiplier: Number(row.multiplier),
      needsCalibration: Number(row.needs_calibration) === 1,
      updatedAt: row.updated_at,
    })),
  };
}

export async function simulateEstimatorPolicy(params: {
  floorMargin: number;
  premiumFactor: number;
  rushFactor: number;
  marketAdjustment: number;
  minMarginAlert: number;
  segmentCode?: string;
}) {
  const db = await getRuntimeDatabase();
  const proposed = {
    floorMargin: clamp(params.floorMargin, 0, 0.95),
    premiumFactor: Math.max(1, Number(params.premiumFactor) || 1),
    rushFactor: Math.max(1, Number(params.rushFactor) || 1),
    marketAdjustment: Math.max(0, Number(params.marketAdjustment) || 1),
    minMarginAlert: clamp(params.minMarginAlert, 0, 0.95),
  };

  const [active, segment, rows] = await Promise.all([
    db.queryOne<any>(
      `SELECT floor_margin,premium_factor,rush_factor,market_adjustment,min_margin_alert,version,status
       FROM estimator_policy_versions
       ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END, created_at DESC LIMIT 1`,
    ),
    db.queryOne<any>(
      'SELECT code,name,multiplier FROM estimator_client_segments WHERE code=?',
      [params.segmentCode || 'STD'],
    ),
    db.queryAll<any>(
      `SELECT pe.id,pe.session_id,es.project_name,o.name AS company,s.name AS service_name,
              b.a_resource_cost,b.b_commission_referral,b.c_document_material,b.d_third_party,b.e_travel_accommodation
       FROM project_estimates pe
       JOIN estimator_sessions es ON es.id=pe.session_id
       JOIN organizations o ON o.id=es.organization_id
       JOIN services s ON s.id=pe.service_id
       JOIN estimator_boq_v2 b ON b.estimate_id=pe.id
       WHERE pe.version=(SELECT MAX(p2.version) FROM project_estimates p2 WHERE p2.session_id=pe.session_id)
       ORDER BY pe.created_at DESC
       LIMIT 20`,
    ),
  ]);

  const current = {
    floorMargin: Number(active?.floor_margin ?? 0.20),
    premiumFactor: Number(active?.premium_factor ?? 1.25),
    rushFactor: Number(active?.rush_factor ?? 1.25),
    marketAdjustment: Number(active?.market_adjustment ?? 1),
    minMarginAlert: Number(active?.min_margin_alert ?? 0.25),
    version: String(active?.version || 'not-configured'),
    status: String(active?.status || 'draft'),
  };
  const segmentMultiplier = Number(segment?.multiplier ?? 1);

  const items = rows.map((row) => {
    const internalCost =
      Number(row.a_resource_cost || 0) +
      Number(row.b_commission_referral || 0) +
      Number(row.c_document_material || 0) +
      Number(row.d_third_party || 0) +
      Number(row.e_travel_accommodation || 0);
    const currentBands = computePricingBands({
      internalCost,
      floorMargin: current.floorMargin,
      segmentMultiplier,
      marketAdjustment: current.marketAdjustment,
      premiumFactor: current.premiumFactor,
    });
    const proposedBands = computePricingBands({
      internalCost,
      floorMargin: proposed.floorMargin,
      segmentMultiplier,
      marketAdjustment: proposed.marketAdjustment,
      premiumFactor: proposed.premiumFactor,
    });
    const delta = proposedBands.standard - currentBands.standard;
    const deltaPct = currentBands.standard > 0 ? (delta / currentBands.standard) * 100 : 0;
    return {
      estimateId: row.id,
      sessionId: row.session_id,
      projectName: row.project_name,
      company: row.company,
      serviceName: row.service_name,
      internalCost,
      current: currentBands,
      proposed: proposedBands,
      standardDelta: delta,
      standardDeltaPct: Math.round(deltaPct * 10) / 10,
    };
  });

  const currentTotal = items.reduce((sum, item) => sum + item.current.standard, 0);
  const proposedTotal = items.reduce((sum, item) => sum + item.proposed.standard, 0);
  const aggregateDelta = proposedTotal - currentTotal;

  return {
    sampleSize: items.length,
    segment: {
      code: segment?.code || params.segmentCode || 'STD',
      name: segment?.name || 'Standard',
      multiplier: segmentMultiplier,
    },
    current,
    proposed,
    aggregate: {
      currentStandardTotal: currentTotal,
      proposedStandardTotal: proposedTotal,
      standardDelta: aggregateDelta,
      standardDeltaPct:
        currentTotal > 0 ? Math.round((aggregateDelta / currentTotal) * 1000) / 10 : 0,
    },
    items,
  };
}

async function audit(entityId: string, action: string, actor: string, before: unknown, after: unknown) {
  const db = await getRuntimeDatabase();
  await db.run(
    `INSERT INTO estimator_audit_logs
      (id,entity_type,entity_id,action,actor,before_json,after_json,created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      randomUUID(),
      'estimator_policy',
      entityId,
      action,
      actor,
      before == null ? null : JSON.stringify(before),
      after == null ? null : JSON.stringify(after),
      new Date().toISOString(),
    ],
  );
}

export async function createEstimatorPolicyDraft(params: {
  version: string;
  floorMargin: number;
  premiumFactor: number;
  rushFactor: number;
  marketAdjustment: number;
  minMarginAlert: number;
  notes?: string;
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const version = String(params.version || '').trim().slice(0, 40);
  if (!version) throw new Error('Policy version is required.');
  const id = `policy-${randomUUID()}`;
  const now = new Date().toISOString();
  const values = {
    version,
    floorMargin: clamp(params.floorMargin, 0, 0.95),
    premiumFactor: Math.max(1, Number(params.premiumFactor) || 1),
    rushFactor: Math.max(1, Number(params.rushFactor) || 1),
    marketAdjustment: Math.max(0, Number(params.marketAdjustment) || 1),
    minMarginAlert: clamp(params.minMarginAlert, 0, 0.95),
    notes: String(params.notes || 'KALIBRASI RTI').slice(0, 2000),
  };
  await db.run(
    `INSERT INTO estimator_policy_versions
      (id,version,effective_from,effective_to,floor_margin,premium_factor,rush_factor,
       market_adjustment,min_margin_alert,status,notes,created_at,updated_at)
     VALUES (?,?,NULL,NULL,?,?,?,?,?,'draft',?,?,?)`,
    [
      id,
      values.version,
      values.floorMargin,
      values.premiumFactor,
      values.rushFactor,
      values.marketAdjustment,
      values.minMarginAlert,
      values.notes,
      now,
      now,
    ],
  );
  await audit(id, 'create_draft', params.actor, null, values);
  return id;
}

export async function activateEstimatorPolicy(params: {
  policyId: string;
  confirmation: string;
  actor: string;
}) {
  if (String(params.confirmation || '').trim() !== 'APPROVE RTI CALIBRATION') {
    throw new Error('Explicit RTI calibration approval phrase is required.');
  }
  const db = await getRuntimeDatabase();
  const policy = await db.queryOne<any>(
    'SELECT * FROM estimator_policy_versions WHERE id=?',
    [params.policyId],
  );
  if (!policy) throw new Error('Policy version not found.');
  if (policy.status !== 'draft') throw new Error('Only a draft policy can be activated.');
  const now = new Date().toISOString();

  await db.batch([
    {
      sql: `UPDATE estimator_policy_versions
            SET status='retired',effective_to=?,updated_at=?
            WHERE status='active' AND id<>?`,
      params: [now, now, params.policyId],
    },
    {
      sql: `UPDATE estimator_policy_versions
            SET status='active',effective_from=?,effective_to=NULL,approved_by=?,updated_at=?
            WHERE id=?`,
      params: [now, params.actor, now, params.policyId],
    },
    {
      sql: `UPDATE estimator_settings
            SET value='APPROVED',updated_at=?
            WHERE key='estimator_calibration_status'`,
      params: [now],
    },
  ]);

  await audit(params.policyId, 'activate', params.actor, policy, {
    status: 'active',
    approvedBy: params.actor,
    effectiveFrom: now,
  });
}

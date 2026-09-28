import { randomUUID } from 'node:crypto';
import { getRuntimeDatabase } from '@/lib/server/runtime-database';
import { getEstimatorSessionByToken } from '@/lib/project-estimator/repository';
import { computePricingBands } from '@/packages/engine/index.js';

function safeJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function setting(key: string, fallback: string) {
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<{ value: string }>(
    'SELECT value FROM estimator_settings WHERE key=?',
    [key],
  );
  return row?.value || fallback;
}

async function audit(
  entityType: string,
  entityId: string,
  action: string,
  actor: string,
  before: unknown,
  after: unknown,
) {
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

async function latestPolicy() {
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<any>(
    `SELECT id,version,floor_margin,premium_factor,rush_factor,market_adjustment,min_margin_alert,status
     FROM estimator_policy_versions
     ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END, created_at DESC
     LIMIT 1`,
  );
  if (!row) throw new Error('Estimator pricing policy is not configured.');
  return {
    id: row.id,
    version: row.version,
    floorMargin: Number(row.floor_margin),
    premiumFactor: Number(row.premium_factor),
    rushFactor: Number(row.rush_factor),
    marketAdjustment: Number(row.market_adjustment),
    minMarginAlert: Number(row.min_margin_alert),
    status: row.status,
  };
}

async function segment(code: string) {
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<any>(
    'SELECT code,name,multiplier,needs_calibration FROM estimator_client_segments WHERE code=?',
    [code],
  );
  if (!row) throw new Error('Client segment is not configured.');
  return {
    code: row.code,
    name: row.name,
    multiplier: Number(row.multiplier),
    needsCalibration: Number(row.needs_calibration) === 1,
  };
}

function approvalLevel(params: {
  finalPrice: number;
  floorPrice: number;
  discountPct: number;
  segmentOverride: boolean;
}) {
  if (
    params.finalPrice < params.floorPrice ||
    params.discountPct > 15 ||
    params.finalPrice > 1_000_000_000 ||
    params.segmentOverride
  ) {
    return { level: 'director', role: 'management' };
  }
  if (params.discountPct <= 10 && params.finalPrice <= 250_000_000) {
    return { level: 'sales_head', role: 'sales_head' };
  }
  return { level: 'management', role: 'management' };
}

async function nextQuotationNumber() {
  const db = await getRuntimeDatabase();
  const prefix = (await setting('quotation_prefix', 'RTI-QUO'))
    .replace(/[^A-Za-z0-9-]/g, '')
    .slice(0, 32) || 'RTI-QUO';
  const now = new Date();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getUTCFullYear());
  const start = `${yyyy}-${mm}-01T00:00:00.000Z`;
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const row = await db.queryOne<{ count: number }>(
    'SELECT COUNT(*) AS count FROM estimator_quotations WHERE created_at>=? AND created_at<?',
    [start, endDate.toISOString()],
  );
  const seq = String(Number(row?.count || 0) + 1).padStart(4, '0');
  return `${prefix}/${mm}/${yyyy}/${seq}`;
}

async function paymentTermsForService(serviceCode: string) {
  if (serviceCode.startsWith('SWDEV')) {
    return safeJson(await setting('payment_terms_swdev', '{"milestones":[30,40,30],"topDays":14}'), {});
  }
  if (serviceCode === 'TRAIN') {
    return safeJson(await setting('payment_terms_training', '{"upfrontPct":100,"topDays":14}'), {});
  }
  return safeJson(await setting('payment_terms_vapt_governance', '{"milestones":[30,50,20],"topDays":14}'), {});
}

export async function getStudioSession(sessionId: string) {
  const db = await getRuntimeDatabase();
  const session = await db.queryOne<any>(
    `SELECT es.id,es.mode,es.project_name,es.status,es.target_timeline,es.budget_expectation,
            es.created_at,es.updated_at,o.name AS company,o.industry,o.company_size,o.country,
            c.name AS contact_name,c.email,c.whatsapp,
            s.id AS service_id,s.name AS service_name,sp.service_code
     FROM estimator_sessions es
     JOIN organizations o ON o.id=es.organization_id
     JOIN contacts c ON c.id=es.contact_id
     JOIN services s ON s.id=es.selected_service_id
     LEFT JOIN estimator_service_profiles sp ON sp.service_id=s.id
     WHERE es.id=?`,
    [sessionId],
  );
  if (!session) throw new Error('Scoping session not found.');

  const [estimate, rfq, provenance, documents, flags, messages, aiLogs, boq, quotations, actual] =
    await Promise.all([
      db.queryOne<any>(
        `SELECT * FROM project_estimates WHERE session_id=? ORDER BY version DESC LIMIT 1`,
        [sessionId],
      ),
      db.queryOne<any>(
        `SELECT r.*,rv.content_json FROM rfqs r
         JOIN rfq_versions rv ON rv.rfq_id=r.id AND rv.version=r.current_version
         WHERE r.session_id=? ORDER BY r.updated_at DESC LIMIT 1`,
        [sessionId],
      ),
      db.queryAll<any>(
        `SELECT question_key,source,evidence_json,confidence,status,updated_at
         FROM estimator_scope_provenance WHERE session_id=? ORDER BY updated_at DESC`,
        [sessionId],
      ),
      db.queryAll<any>(
        `SELECT id,file_name,mime_type,file_size,parse_status,security_flags_json,created_at
         FROM estimator_document_intake WHERE session_id=? ORDER BY created_at DESC`,
        [sessionId],
      ),
      db.queryAll<any>(
        `SELECT code,severity,message,evidence_json,status,created_at
         FROM estimator_risk_flags_v2 WHERE session_id=? ORDER BY created_at DESC`,
        [sessionId],
      ),
      db.queryAll<any>(
        `SELECT role,content,tool_calls_json,created_at
         FROM estimator_scoping_messages WHERE session_id=? ORDER BY created_at ASC LIMIT 100`,
        [sessionId],
      ),
      db.queryAll<any>(
        `SELECT model,input_tokens,output_tokens,cost_usd,latency_ms,tool_iterations,blocked_numbers_count,status,created_at
         FROM estimator_ai_audit_logs WHERE session_id=? ORDER BY created_at DESC LIMIT 50`,
        [sessionId],
      ),
      db.queryOne<any>(
        `SELECT b.* FROM estimator_boq_v2 b
         JOIN project_estimates pe ON pe.id=b.estimate_id
         WHERE pe.session_id=? ORDER BY pe.version DESC LIMIT 1`,
        [sessionId],
      ),
      db.queryAll<any>(
        `SELECT id,doc_number,version,segment_code,price_option,internal_cost,floor_price,standard_price,premium_price,
                final_price,discount_pct,payment_terms_json,valid_until,approval_level_required,status,created_at,updated_at
         FROM estimator_quotations WHERE session_id=? ORDER BY created_at DESC`,
        [sessionId],
      ),
      db.queryOne<any>(
        `SELECT a.* FROM estimator_actuals a
         JOIN project_estimates pe ON pe.id=a.estimate_id
         WHERE pe.session_id=? ORDER BY pe.version DESC LIMIT 1`,
        [sessionId],
      ),
    ]);

  const quoteApprovals = quotations.length
    ? await db.queryAll<any>(
        `SELECT quotation_id,level,approver_role,actor,decision,note,decided_at,created_at
         FROM estimator_quotation_approvals
         WHERE quotation_id IN (${quotations.map(() => '?').join(',')})
         ORDER BY created_at DESC`,
        quotations.map((q) => q.id),
      )
    : [];

  return {
    session: {
      id: session.id,
      mode: session.mode,
      projectName: session.project_name,
      status: session.status,
      targetTimeline: session.target_timeline,
      budgetExpectation: session.budget_expectation,
      company: session.company,
      industry: session.industry,
      companySize: session.company_size,
      country: session.country,
      contactName: session.contact_name,
      email: session.email,
      whatsapp: session.whatsapp,
      serviceId: session.service_id,
      serviceName: session.service_name,
      serviceCode: session.service_code || '',
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    },
    estimate: estimate
      ? {
          id: estimate.id,
          version: Number(estimate.version),
          complexityIndex: Number(estimate.complexity_index),
          complexityLevel: estimate.complexity_level,
          projectSize: estimate.project_size,
          effortDays: Number(estimate.effort_days),
          durationMinWeeks: Number(estimate.duration_min_weeks),
          durationMaxWeeks: Number(estimate.duration_max_weeks),
          readinessScore: Number(estimate.readiness_score),
          team: safeJson(estimate.team_json, []),
          factors: safeJson(estimate.factors_json, []),
          createdAt: estimate.created_at,
        }
      : null,
    rfq: rfq
      ? {
          id: rfq.id,
          rfqNumber: rfq.rfq_number,
          version: Number(rfq.current_version),
          status: rfq.status,
          content: safeJson(rfq.content_json, {}),
          updatedAt: rfq.updated_at,
        }
      : null,
    provenance: provenance.map((row) => ({
      key: row.question_key,
      source: row.source,
      evidence: safeJson(row.evidence_json, {}),
      confidence: Number(row.confidence),
      status: row.status,
      updatedAt: row.updated_at,
    })),
    documents: documents.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSize: Number(row.file_size),
      parseStatus: row.parse_status,
      securityFlags: safeJson(row.security_flags_json, []),
      createdAt: row.created_at,
    })),
    riskFlags: flags.map((row) => ({
      code: row.code,
      severity: row.severity,
      message: row.message,
      evidence: safeJson(row.evidence_json, {}),
      status: row.status,
      createdAt: row.created_at,
    })),
    messages: messages.map((row) => ({
      role: row.role,
      content: row.content,
      toolCalls: safeJson(row.tool_calls_json, []),
      createdAt: row.created_at,
    })),
    aiAudit: aiLogs.map((row) => ({
      model: row.model,
      inputTokens: Number(row.input_tokens),
      outputTokens: Number(row.output_tokens),
      costUsd: Number(row.cost_usd),
      latencyMs: Number(row.latency_ms),
      toolIterations: Number(row.tool_iterations),
      blockedNumbersCount: Number(row.blocked_numbers_count),
      status: row.status,
      createdAt: row.created_at,
    })),
    boq: boq
      ? {
          estimateId: boq.estimate_id,
          aResourceCost: Number(boq.a_resource_cost),
          bCommissionReferral: Number(boq.b_commission_referral),
          cDocumentMaterial: Number(boq.c_document_material),
          dThirdParty: Number(boq.d_third_party),
          eTravelAccommodation: Number(boq.e_travel_accommodation),
          note: boq.note || '',
          updatedAt: boq.updated_at,
        }
      : estimate
        ? {
            estimateId: estimate.id,
            aResourceCost: 0,
            bCommissionReferral: 0,
            cDocumentMaterial: 0,
            dThirdParty: 0,
            eTravelAccommodation: 0,
            note: '',
            updatedAt: null,
          }
        : null,
    quotations: quotations.map((row) => ({
      id: row.id,
      docNumber: row.doc_number,
      version: Number(row.version),
      segmentCode: row.segment_code,
      priceOption: row.price_option,
      internalCost: Number(row.internal_cost),
      floorPrice: Number(row.floor_price),
      standardPrice: Number(row.standard_price),
      premiumPrice: Number(row.premium_price),
      finalPrice: Number(row.final_price),
      discountPct: Number(row.discount_pct),
      paymentTerms: safeJson(row.payment_terms_json, {}),
      validUntil: row.valid_until,
      approvalLevelRequired: row.approval_level_required,
      status: row.status,
      approvals: quoteApprovals
        .filter((approval) => approval.quotation_id === row.id)
        .map((approval) => ({
          level: approval.level,
          approverRole: approval.approver_role,
          actor: approval.actor,
          decision: approval.decision,
          note: approval.note,
          decidedAt: approval.decided_at,
        })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    actual: actual
      ? {
          estimateId: actual.estimate_id,
          actualMd: actual.actual_md == null ? null : Number(actual.actual_md),
          actualCost: actual.actual_cost == null ? null : Number(actual.actual_cost),
          completedAt: actual.completed_at,
          note: actual.note || '',
        }
      : null,
  };
}

export async function saveStudioBoq(params: {
  estimateId: string;
  aResourceCost: number;
  bCommissionReferral: number;
  cDocumentMaterial: number;
  dThirdParty: number;
  eTravelAccommodation: number;
  note?: string;
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const estimate = await db.queryOne<{ id: string }>('SELECT id FROM project_estimates WHERE id=?', [params.estimateId]);
  if (!estimate) throw new Error('Estimate not found.');
  const money = (value: number) => Math.max(0, Math.round(Number(value) || 0));
  const before = await db.queryOne<any>('SELECT * FROM estimator_boq_v2 WHERE estimate_id=?', [params.estimateId]);
  const next = {
    aResourceCost: money(params.aResourceCost),
    bCommissionReferral: money(params.bCommissionReferral),
    cDocumentMaterial: money(params.cDocumentMaterial),
    dThirdParty: money(params.dThirdParty),
    eTravelAccommodation: money(params.eTravelAccommodation),
    note: String(params.note || '').slice(0, 2000),
  };
  await db.run(
    `INSERT INTO estimator_boq_v2
      (estimate_id,a_resource_cost,b_commission_referral,c_document_material,d_third_party,e_travel_accommodation,note,updated_by,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(estimate_id) DO UPDATE SET
       a_resource_cost=excluded.a_resource_cost,
       b_commission_referral=excluded.b_commission_referral,
       c_document_material=excluded.c_document_material,
       d_third_party=excluded.d_third_party,
       e_travel_accommodation=excluded.e_travel_accommodation,
       note=excluded.note,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
    [
      params.estimateId,
      next.aResourceCost,
      next.bCommissionReferral,
      next.cDocumentMaterial,
      next.dThirdParty,
      next.eTravelAccommodation,
      next.note || null,
      params.actor,
      new Date().toISOString(),
    ],
  );
  await audit('estimator_boq_v2', params.estimateId, before ? 'update' : 'create', params.actor, before, next);
  return next;
}

export async function createStudioQuotation(params: {
  sessionId: string;
  estimateId: string;
  segmentCode: string;
  priceOption: 'floor' | 'standard' | 'premium' | 'custom';
  customPrice?: number;
  discountPct?: number;
  segmentOverrideReason?: string;
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const [estimate, boq, service] = await Promise.all([
    db.queryOne<any>('SELECT id,session_id FROM project_estimates WHERE id=? AND session_id=?', [params.estimateId, params.sessionId]),
    db.queryOne<any>('SELECT * FROM estimator_boq_v2 WHERE estimate_id=?', [params.estimateId]),
    db.queryOne<any>(
      `SELECT sp.service_code FROM estimator_sessions es
       JOIN estimator_service_profiles sp ON sp.service_id=es.selected_service_id
       WHERE es.id=?`,
      [params.sessionId],
    ),
  ]);
  if (!estimate) throw new Error('Estimate not found for session.');
  if (!boq) throw new Error('Internal BoQ A-E must be completed before quotation.');
  const internalCost =
    Number(boq.a_resource_cost) +
    Number(boq.b_commission_referral) +
    Number(boq.c_document_material) +
    Number(boq.d_third_party) +
    Number(boq.e_travel_accommodation);
  if (internalCost <= 0) throw new Error('Internal BoQ cost must be greater than zero.');

  const policy = await latestPolicy();
  const selectedSegment = await segment(params.segmentCode || 'STD');
  const bands = computePricingBands({
    internalCost,
    floorMargin: policy.floorMargin,
    segmentMultiplier: selectedSegment.multiplier,
    marketAdjustment: policy.marketAdjustment,
    premiumFactor: policy.premiumFactor,
  });
  const basePrice =
    params.priceOption === 'floor' ? bands.floor :
    params.priceOption === 'premium' ? bands.premium :
    params.priceOption === 'custom' ? Math.max(0, Math.round(Number(params.customPrice) || 0)) :
    bands.standard;
  const discountPct = Math.max(0, Math.min(100, Number(params.discountPct || 0)));
  const finalPrice = Math.max(0, Math.round(basePrice * (1 - discountPct / 100)));
  const segmentOverride = selectedSegment.code !== 'STD' && Boolean(params.segmentOverrideReason?.trim());
  const approval = approvalLevel({
    finalPrice,
    floorPrice: bands.floor,
    discountPct,
    segmentOverride,
  });
  const docNumber = await nextQuotationNumber();
  const validDays = Math.max(1, Math.min(120, Number(await setting('quotation_valid_days', '14')) || 14));
  const validUntil = new Date(Date.now() + validDays * 86400000).toISOString();
  const rfq = await db.queryOne<{ id: string }>(
    'SELECT id FROM rfqs WHERE session_id=? ORDER BY updated_at DESC LIMIT 1',
    [params.sessionId],
  );
  const paymentTerms = await paymentTermsForService(String(service?.service_code || ''));
  const id = randomUUID();
  const now = new Date().toISOString();

  await db.batch([
    {
      sql: `INSERT INTO estimator_quotations
        (id,session_id,estimate_id,rfq_id,doc_number,version,segment_code,price_option,internal_cost,
         floor_price,standard_price,premium_price,final_price,discount_pct,payment_terms_json,
         valid_until,approval_level_required,status,created_by,created_at,updated_at)
       VALUES (?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?,'pending_approval',?,?,?)`,
      params: [
        id,
        params.sessionId,
        params.estimateId,
        rfq?.id || null,
        docNumber,
        selectedSegment.code,
        params.priceOption,
        internalCost,
        bands.floor,
        bands.standard,
        bands.premium,
        finalPrice,
        discountPct,
        JSON.stringify(paymentTerms),
        validUntil,
        approval.level,
        params.actor,
        now,
        now,
      ],
    },
    {
      sql: `INSERT INTO estimator_quotation_approvals
        (id,quotation_id,level,approver_role,decision,created_at)
       VALUES (?,?,?,?, 'pending', ?)`,
      params: [randomUUID(), id, approval.level, approval.role, now],
    },
  ]);

  await audit('estimator_quotation', id, 'create', params.actor, null, {
    docNumber,
    policyVersion: policy.version,
    policyStatus: policy.status,
    segmentCode: selectedSegment.code,
    priceOption: params.priceOption,
    internalCost,
    floorPrice: bands.floor,
    standardPrice: bands.standard,
    premiumPrice: bands.premium,
    finalPrice,
    discountPct,
    approvalLevelRequired: approval.level,
    segmentOverrideReason: params.segmentOverrideReason || null,
  });

  return { id, docNumber, approvalLevelRequired: approval.level };
}

export async function decideStudioQuotation(params: {
  quotationId: string;
  decision: 'approved' | 'rejected';
  note?: string;
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const quote = await db.queryOne<any>('SELECT * FROM estimator_quotations WHERE id=?', [params.quotationId]);
  if (!quote) throw new Error('Quotation not found.');
  if (!['pending_approval','approved'].includes(quote.status)) {
    throw new Error('Quotation is not awaiting approval.');
  }
  const now = new Date().toISOString();
  await db.batch([
    {
      sql: `UPDATE estimator_quotation_approvals
            SET actor=?,decision=?,note=?,decided_at=?
            WHERE quotation_id=? AND level=? AND decision='pending'`,
      params: [
        params.actor,
        params.decision,
        String(params.note || '').slice(0, 2000) || null,
        now,
        params.quotationId,
        quote.approval_level_required,
      ],
    },
    {
      sql: 'UPDATE estimator_quotations SET status=?,updated_at=? WHERE id=?',
      params: [params.decision === 'approved' ? 'approved' : 'rejected', now, params.quotationId],
    },
  ]);
  await audit('estimator_quotation', params.quotationId, params.decision, params.actor, quote, {
    status: params.decision === 'approved' ? 'approved' : 'rejected',
    note: params.note || '',
  });
}

export async function markStudioQuotationSent(params: {
  quotationId: string;
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const quote = await db.queryOne<any>('SELECT * FROM estimator_quotations WHERE id=?', [params.quotationId]);
  if (!quote) throw new Error('Quotation not found.');
  if (quote.status !== 'approved') throw new Error('Only approved quotations can be marked sent.');
  const now = new Date().toISOString();
  await db.run('UPDATE estimator_quotations SET status=\'sent\',updated_at=? WHERE id=?', [now, params.quotationId]);
  await audit('estimator_quotation', params.quotationId, 'sent', params.actor, quote, { status: 'sent' });
}

export async function saveEstimatorActual(params: {
  estimateId: string;
  actualMd?: number | null;
  actualCost?: number | null;
  completedAt?: string | null;
  note?: string;
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const before = await db.queryOne<any>('SELECT * FROM estimator_actuals WHERE estimate_id=?', [params.estimateId]);
  await db.run(
    `INSERT INTO estimator_actuals
      (estimate_id,actual_md,actual_cost,completed_at,note,updated_by,updated_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(estimate_id) DO UPDATE SET
       actual_md=excluded.actual_md,actual_cost=excluded.actual_cost,
       completed_at=excluded.completed_at,note=excluded.note,
       updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
    [
      params.estimateId,
      params.actualMd == null ? null : Math.max(0, Number(params.actualMd)),
      params.actualCost == null ? null : Math.max(0, Math.round(Number(params.actualCost))),
      params.completedAt || null,
      String(params.note || '').slice(0, 2000) || null,
      params.actor,
      new Date().toISOString(),
    ],
  );
  await audit('estimator_actuals', params.estimateId, before ? 'update' : 'create', params.actor, before, params);
}

export async function getPortalSession(resumeToken: string) {
  const state = await getEstimatorSessionByToken(resumeToken);
  const db = await getRuntimeDatabase();
  const quotes = await db.queryAll<any>(
    `SELECT id,doc_number,final_price,payment_terms_json,valid_until,status,created_at,updated_at
     FROM estimator_quotations
     WHERE session_id=? AND status IN ('approved','sent','accepted','rejected','expired')
     ORDER BY created_at DESC`,
    [state.sessionId],
  );
  const messages = await db.queryAll<any>(
    `SELECT sender_type,sender_name,content,created_at
     FROM estimator_client_messages WHERE session_id=? ORDER BY created_at ASC LIMIT 200`,
    [state.sessionId],
  );
  return {
    sessionId: state.sessionId,
    input: state.input,
    estimate: state.estimate,
    rfq: state.rfq,
    quotations: quotes.map((row) => ({
      id: row.id,
      docNumber: row.doc_number,
      finalPrice: Number(row.final_price),
      paymentTerms: safeJson(row.payment_terms_json, {}),
      validUntil: row.valid_until,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    messages: messages.map((row) => ({
      senderType: row.sender_type,
      senderName: row.sender_name,
      content: row.content,
      createdAt: row.created_at,
    })),
  };
}


export async function getQuotationPdfData(quotationId: string) {
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<any>(
    `SELECT q.id,q.doc_number,q.final_price,q.payment_terms_json,q.valid_until,q.status,
            es.project_name,o.name AS company,s.name AS service_name
     FROM estimator_quotations q
     JOIN estimator_sessions es ON es.id=q.session_id
     JOIN organizations o ON o.id=es.organization_id
     JOIN services s ON s.id=es.selected_service_id
     WHERE q.id=?`,
    [quotationId],
  );
  if (!row) throw new Error('Quotation not found.');
  return {
    id: row.id,
    docNumber: row.doc_number,
    company: row.company,
    projectName: row.project_name,
    serviceName: row.service_name,
    finalPrice: Number(row.final_price),
    paymentTerms: safeJson<Record<string, unknown>>(row.payment_terms_json, {}),
    validUntil: row.valid_until,
    status: row.status,
  };
}

export async function verifyPortalQuotationAccess(quotationId: string, resumeToken: string) {
  const state = await getEstimatorSessionByToken(resumeToken);
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<{ id: string; session_id: string; status: string }>(
    'SELECT id,session_id,status FROM estimator_quotations WHERE id=?',
    [quotationId],
  );
  return Boolean(
    row &&
    row.session_id === state.sessionId &&
    ['approved','sent','accepted','rejected','expired'].includes(row.status),
  );
}


export async function addPortalMessage(params: {
  resumeToken: string;
  content: string;
  senderName?: string;
}) {
  const state = await getEstimatorSessionByToken(params.resumeToken);
  const content = String(params.content || '').trim().slice(0, 4000);
  if (!content) throw new Error('Message is required.');
  const db = await getRuntimeDatabase();
  await db.run(
    `INSERT INTO estimator_client_messages
      (id,session_id,sender_type,sender_name,content,created_at)
     VALUES (?,?,'client',?,?,?)`,
    [
      randomUUID(),
      state.sessionId,
      String(params.senderName || state.input.profile.contactName || '').slice(0, 180) || null,
      content,
      new Date().toISOString(),
    ],
  );
  await audit('estimator_client_message', state.sessionId, 'client_message', 'portal-client', null, {
    length: content.length,
  });
}

import { randomUUID } from 'node:crypto';
import { deletePrivateObject } from '@/lib/server/object-storage';
import { getRuntimeDatabase } from '@/lib/server/runtime-database';

async function retentionDays() {
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<{ value: string }>(
    "SELECT value FROM estimator_settings WHERE key='public_session_retention_days'",
  );
  return Math.max(30, Math.min(730, Number(row?.value || 90) || 90));
}

function cutoffIso(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

async function candidates() {
  const db = await getRuntimeDatabase();
  const days = await retentionDays();
  const cutoff = cutoffIso(days);
  const rows = await db.queryAll<any>(
    "SELECT es.id,es.status,es.created_at,es.organization_id,es.contact_id " +
    "FROM estimator_sessions es " +
    "WHERE es.created_at < ? " +
    "AND es.status IN ('draft','estimated','rfq_draft') " +
    "AND NOT EXISTS (SELECT 1 FROM estimator_quotations q WHERE q.session_id=es.id) " +
    "AND NOT EXISTS (SELECT 1 FROM rfqs r WHERE r.session_id=es.id AND r.status <> 'draft') " +
    "AND NOT EXISTS (SELECT 1 FROM opportunities op JOIN rfqs r2 ON r2.id=op.rfq_id WHERE r2.session_id=es.id) " +
    "ORDER BY es.created_at ASC LIMIT 500",
    [cutoff],
  );
  return { days, cutoff, rows };
}

export async function previewEstimatorRetention() {
  const { days, cutoff, rows } = await candidates();
  return {
    retentionDays: days,
    cutoffAt: cutoff,
    candidateCount: rows.length,
    candidates: rows.map((row) => ({
      sessionId: row.id,
      status: row.status,
      createdAt: row.created_at,
    })),
  };
}

export async function runEstimatorRetention(params: { actor: string; confirmation: string }) {
  if (String(params.confirmation || '').trim() !== 'ANONYMIZE EXPIRED SESSIONS') {
    throw new Error('Retention confirmation phrase does not match.');
  }

  const db = await getRuntimeDatabase();
  const { days, cutoff, rows } = await candidates();
  let anonymizedCount = 0;
  let deletedDocumentCount = 0;
  let deletedAttachmentCount = 0;

  for (const row of rows) {
    const documents = await db.queryAll<{ storage_key: string }>(
      'SELECT storage_key FROM estimator_document_intake WHERE session_id=? AND storage_key IS NOT NULL',
      [row.id],
    );
    const attachments = await db.queryAll<{ storage_key: string }>(
      "SELECT a.storage_key FROM rfq_attachments a JOIN rfqs r ON r.id=a.rfq_id " +
      "WHERE r.session_id=? AND r.status='draft'",
      [row.id],
    );

    for (const item of [...documents, ...attachments]) {
      if (!item.storage_key) continue;
      try {
        await deletePrivateObject(item.storage_key);
      } catch (error) {
        console.warn('Retention object deletion failed:', error instanceof Error ? error.message : String(error));
      }
    }
    deletedDocumentCount += documents.length;
    deletedAttachmentCount += attachments.length;

    const now = new Date().toISOString();
    const organizationId = row.organization_id ? String(row.organization_id) : null;
    const contactId = row.contact_id ? String(row.contact_id) : null;

    await db.batch([
      { sql: 'DELETE FROM estimator_scoping_messages WHERE session_id=?', params: [row.id] },
      { sql: 'DELETE FROM estimator_client_messages WHERE session_id=?', params: [row.id] },
      { sql: 'DELETE FROM estimator_scope_provenance WHERE session_id=?', params: [row.id] },
      { sql: 'DELETE FROM estimator_ai_audit_logs WHERE session_id=?', params: [row.id] },
      { sql: 'DELETE FROM estimator_risk_flags_v2 WHERE session_id=?', params: [row.id] },
      { sql: 'DELETE FROM estimator_document_intake WHERE session_id=?', params: [row.id] },
      { sql: 'DELETE FROM estimator_answers WHERE session_id=?', params: [row.id] },
      {
        sql: "DELETE FROM rfqs WHERE session_id=? AND status='draft' " +
          "AND NOT EXISTS (SELECT 1 FROM opportunities op WHERE op.rfq_id=rfqs.id) " +
          "AND NOT EXISTS (SELECT 1 FROM estimator_quotations q WHERE q.rfq_id=rfqs.id)",
        params: [row.id],
      },
      { sql: 'UPDATE estimator_events SET metadata_json=NULL WHERE session_id=?', params: [row.id] },
      {
        sql: "UPDATE estimator_sessions SET organization_id=NULL,contact_id=NULL,project_name='Anonymized session'," +
          "business_objectives_json='[]',target_timeline=NULL,budget_expectation=NULL,source_context_json=NULL," +
          "secure_token_hash=NULL,status='archived',updated_at=? WHERE id=?",
        params: [now, row.id],
      },
      ...(contactId ? [{
        sql: 'DELETE FROM contacts WHERE id=? AND NOT EXISTS (SELECT 1 FROM estimator_sessions es WHERE es.contact_id=contacts.id)',
        params: [contactId],
      }] : []),
      ...(organizationId ? [{
        sql: 'DELETE FROM organizations WHERE id=? ' +
          'AND NOT EXISTS (SELECT 1 FROM estimator_sessions es WHERE es.organization_id=organizations.id) ' +
          'AND NOT EXISTS (SELECT 1 FROM contacts c WHERE c.organization_id=organizations.id) ' +
          'AND NOT EXISTS (SELECT 1 FROM opportunities op WHERE op.organization_id=organizations.id)',
        params: [organizationId],
      }] : []),
    ]);

    anonymizedCount += 1;
  }

  const runId = randomUUID();
  await db.run(
    'INSERT INTO estimator_retention_runs ' +
      '(id,cutoff_at,retention_days,candidate_count,anonymized_count,deleted_document_count,deleted_attachment_count,actor,created_at) ' +
      'VALUES (?,?,?,?,?,?,?,?,?)',
    [
      runId, cutoff, days, rows.length, anonymizedCount,
      deletedDocumentCount, deletedAttachmentCount, params.actor, new Date().toISOString(),
    ],
  );

  return {
    runId,
    retentionDays: days,
    cutoffAt: cutoff,
    candidateCount: rows.length,
    anonymizedCount,
    deletedDocumentCount,
    deletedAttachmentCount,
  };
}

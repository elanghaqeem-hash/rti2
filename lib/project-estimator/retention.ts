import { deletePrivateObject } from '@/lib/server/object-storage';
import { getRuntimeDatabase } from '@/lib/server/runtime-database';

export async function runEstimatorRetention(params: {
  olderThanDays?: number;
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const days = Math.max(30, Math.min(3650, Math.trunc(params.olderThanDays || 90)));
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const sessions = await db.queryAll<any>(
    `SELECT es.id,es.organization_id,es.contact_id
     FROM estimator_sessions es
     LEFT JOIN rfqs r ON r.session_id=es.id
     WHERE es.status='draft'
       AND es.created_by IS NULL
       AND es.updated_at<?
       AND r.id IS NULL
     ORDER BY es.updated_at ASC
     LIMIT 500`,
    [cutoff],
  );

  let storageDeleted = 0;
  let storageFailures = 0;
  for (const session of sessions) {
    const docs = await db.queryAll<{ storage_key: string | null }>(
      'SELECT storage_key FROM estimator_document_intake WHERE session_id=?',
      [session.id],
    ).catch(() => []);
    for (const doc of docs) {
      if (!doc.storage_key) continue;
      try {
        await deletePrivateObject(doc.storage_key);
        storageDeleted += 1;
      } catch {
        storageFailures += 1;
      }
    }
  }

  const now = new Date().toISOString();
  for (const session of sessions) {
    const anonymousEmail = `anonymized-${String(session.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 24)}@invalid.local`;
    await db.batch([
      {
        sql: `UPDATE organizations SET
              name='Anonymized',industry=NULL,company_size=NULL,employee_count=NULL,office_count=NULL,
              location=NULL,country=NULL,website=NULL,updated_at=?
              WHERE id=?`,
        params: [now, session.organization_id],
      },
      {
        sql: `UPDATE contacts SET
              name='Anonymized',title=NULL,department=NULL,email=?,phone=NULL,whatsapp=NULL,
              preferred_channel=NULL,updated_at=?
              WHERE id=?`,
        params: [anonymousEmail, now, session.contact_id],
      },
      {
        sql: `UPDATE estimator_sessions SET
              project_name='Anonymized public session',business_objectives_json='[]',
              target_timeline=NULL,budget_expectation=NULL,source_context_json=NULL,
              status='archived',secure_token_hash=NULL,updated_at=?
              WHERE id=?`,
        params: [now, session.id],
      },
      { sql: 'DELETE FROM estimator_answers WHERE session_id=?', params: [session.id] },
      { sql: 'DELETE FROM estimator_scoping_messages WHERE session_id=?', params: [session.id] },
      { sql: 'DELETE FROM estimator_scope_provenance WHERE session_id=?', params: [session.id] },
      { sql: 'DELETE FROM estimator_document_intake WHERE session_id=?', params: [session.id] },
      {
        sql: `INSERT INTO estimator_audit_logs
              (id,entity_type,entity_id,action,actor,before_json,after_json,created_at)
              VALUES (lower(hex(randomblob(16))),'estimator_session',?,'retention_anonymize',?,NULL,?,?)`,
        params: [
          session.id,
          params.actor,
          JSON.stringify({ cutoff, retentionDays: days }),
          now,
        ],
      },
    ]);
  }

  return {
    retentionDays: days,
    cutoff,
    sessionsAnonymized: sessions.length,
    storageDeleted,
    storageFailures,
  };
}

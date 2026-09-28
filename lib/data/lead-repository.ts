import type { Lead } from '@/lib/scoring/leads';
import {
  getRuntimeDatabase,
  RuntimeDatabaseUnavailableError,
} from '@/lib/server/runtime-database';

type LeadRow = {
  id: string;
  created_at: string;
  source: string;
  tool_slug: string | null;
  name: string;
  role: string;
  company: string;
  sector: string;
  email: string;
  whatsapp: string | null;
  need_summary: string | null;
  score: number;
  status: Lead['status'];
  consent_at: string;
  consent_version: string;
};

export class LeadDatabaseUnavailableError extends Error {
  constructor(message = 'RTI server database is not available or not initialized.') {
    super(message);
    this.name = 'LeadDatabaseUnavailableError';
  }
}

function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    createdAt: row.created_at,
    source: row.source,
    toolSlug: row.tool_slug || undefined,
    name: row.name,
    role: row.role,
    company: row.company,
    sector: row.sector,
    email: row.email,
    whatsapp: row.whatsapp || undefined,
    needSummary: row.need_summary || undefined,
    score: Number(row.score),
    status: row.status,
    consentAt: row.consent_at,
    consentVersion: row.consent_version,
  };
}

async function leadDatabase() {
  try {
    return await getRuntimeDatabase();
  } catch (error) {
    if (error instanceof RuntimeDatabaseUnavailableError) {
      throw new LeadDatabaseUnavailableError(error.message);
    }
    throw error;
  }
}

export async function createPersistentLead(lead: Lead): Promise<Lead> {
  try {
    const database = await leadDatabase();

    await database.run(
      `INSERT INTO leads (
        id,
        created_at,
        source,
        tool_slug,
        name,
        role,
        company,
        sector,
        email,
        whatsapp,
        need_summary,
        score,
        status,
        consent_at,
        consent_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lead.id,
        lead.createdAt,
        lead.source,
        lead.toolSlug || null,
        lead.name,
        lead.role,
        lead.company,
        lead.sector,
        lead.email,
        lead.whatsapp || null,
        lead.needSummary || null,
        lead.score,
        lead.status,
        lead.consentAt,
        lead.consentVersion,
      ],
    );

    return lead;
  } catch (error) {
    if (error instanceof LeadDatabaseUnavailableError) throw error;
    throw new LeadDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Lead database insert failed.',
    );
  }
}

export async function listPersistentLeads(limit = 500): Promise<Lead[]> {
  try {
    const database = await leadDatabase();
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);

    const rows = await database.queryAll<LeadRow>(
      `SELECT
        id,
        created_at,
        source,
        tool_slug,
        name,
        role,
        company,
        sector,
        email,
        whatsapp,
        need_summary,
        score,
        status,
        consent_at,
        consent_version
      FROM leads
      ORDER BY created_at DESC
      LIMIT ?`,
      [safeLimit],
    );

    return rows.map(rowToLead);
  } catch (error) {
    if (error instanceof LeadDatabaseUnavailableError) throw error;
    throw new LeadDatabaseUnavailableError(
      error instanceof Error ? error.message : 'Lead database query failed.',
    );
  }
}

export async function checkLeadDatabase(): Promise<boolean> {
  try {
    const database = await leadDatabase();
    const row = await database.queryOne<{ ok?: number }>('SELECT 1 AS ok');
    return row?.ok === 1;
  } catch {
    return false;
  }
}

import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { Lead } from '@/lib/scoring/leads';

type D1Result<T = unknown> = {
  success?: boolean;
  results?: T[];
  meta?: {
    changes?: number;
    last_row_id?: number;
  };
};

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = unknown>() => Promise<T | null>;
  all: <T = unknown>() => Promise<D1Result<T>>;
  run: () => Promise<D1Result>;
};

type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatement;
};

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
  constructor(message = 'Cloudflare D1 binding RTI_DB is not available.') {
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

export function getLeadDatabase(): D1DatabaseLike {
  try {
    const context = getCloudflareContext();
    const env = context.env as Record<string, unknown>;
    const database = env.RTI_DB as D1DatabaseLike | undefined;

    if (!database || typeof database.prepare !== 'function') {
      throw new LeadDatabaseUnavailableError();
    }

    return database;
  } catch (error) {
    if (error instanceof LeadDatabaseUnavailableError) throw error;
    throw new LeadDatabaseUnavailableError();
  }
}

export async function createPersistentLead(lead: Lead): Promise<Lead> {
  const database = getLeadDatabase();

  const result = await database
    .prepare(
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
    )
    .bind(
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
    )
    .run();

  if (result.success === false) {
    throw new Error('D1 insert failed.');
  }

  return lead;
}

export async function listPersistentLeads(limit = 500): Promise<Lead[]> {
  const database = getLeadDatabase();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);

  const result = await database
    .prepare(
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
    )
    .bind(safeLimit)
    .all<LeadRow>();

  if (result.success === false || !Array.isArray(result.results)) {
    throw new Error('D1 lead query failed.');
  }

  return result.results.map(rowToLead);
}

export async function checkLeadDatabase(): Promise<boolean> {
  try {
    const database = getLeadDatabase();
    const row = await database.prepare('SELECT 1 AS ok').first<{ ok: number }>();
    return row?.ok === 1;
  } catch {
    return false;
  }
}

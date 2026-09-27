import { NextResponse } from 'next/server';
import { calculateLeadScore, type Lead } from '@/lib/scoring/leads';
import {
  createPersistentLead,
  LeadDatabaseUnavailableError,
  listPersistentLeads,
} from '@/lib/data/lead-repository';
import {
  enforceRateLimit,
  rateLimitHeaders,
  verifyTurnstile,
} from '@/lib/security/request-protection';

export const runtime = 'nodejs';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

const CONSENT_VERSION = '1.0-UU-PDP';

function databaseUnavailablePayload() {
  return {
    success: false,
    leads: [],
    database: {
      connected: false,
      persistence: 'cloudflare-d1',
    },
    error:
      'Database production belum tersedia atau migration belum diterapkan. Tidak ada data dummy, sample, fallback, atau penyimpanan sementara yang digunakan.',
  };
}

function normalizeText(
  value: unknown,
  options: { max: number; required?: boolean },
): string {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (options.required && !normalized) {
    throw new Error('required');
  }

  return normalized.slice(0, options.max);
}

function normalizeEmail(value: unknown): string {
  const email = normalizeText(value, { max: 254, required: true }).toLowerCase();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!isValid) throw new Error('email');

  return email;
}

function normalizeSubmission(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new Error('body');
  }

  const value = body as Record<string, unknown>;

  if (value.consent !== true) {
    throw new Error('consent');
  }

  const source = normalizeText(value.source, { max: 64 }) || 'website';
  const toolSlug = normalizeText(value.toolSlug, { max: 100 });
  const name = normalizeText(value.name, { max: 120, required: true });
  const role = normalizeText(value.role, { max: 120, required: true });
  const company = normalizeText(value.company, { max: 180, required: true });
  const sector = normalizeText(value.sector, { max: 80, required: true });
  const email = normalizeEmail(value.email);
  const whatsapp = normalizeText(value.whatsapp, { max: 40 });
  const needSummary = normalizeText(value.needSummary, { max: 12_000 });

  return {
    source,
    toolSlug: toolSlug || undefined,
    name,
    role,
    company,
    sector,
    email,
    whatsapp: whatsapp || undefined,
    needSummary: needSummary || undefined,
  };
}

function databaseErrorResponse(rateLimitHeadersValue?: Record<string, string>) {
  return NextResponse.json(databaseUnavailablePayload(), {
    status: 503,
    headers: {
      ...NO_STORE_HEADERS,
      ...(rateLimitHeadersValue || {}),
    },
  });
}

export async function POST(req: Request) {
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'lead-submit',
    limit: 8,
    windowSeconds: 300,
  });

  const securityHeaders = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    const status = rateLimit.reason === 'limit-exceeded' ? 429 : 503;
    return NextResponse.json(
      {
        success: false,
        error:
          status === 429
            ? 'Terlalu banyak pengiriman formulir. Silakan coba kembali beberapa menit lagi.'
            : 'Proteksi formulir belum siap.',
      },
      {
        status,
        headers: {
          ...NO_STORE_HEADERS,
          ...securityHeaders,
        },
      },
    );
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 100_000) {
    return NextResponse.json(
      { success: false, error: 'Payload formulir terlalu besar.' },
      {
        status: 413,
        headers: {
          ...NO_STORE_HEADERS,
          ...securityHeaders,
        },
      },
    );
  }

  const body = await req.json().catch(() => null);
  const turnstile = await verifyTurnstile(
    req,
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).turnstileToken
      : undefined,
  );

  if (!turnstile.success) {
    return NextResponse.json(
      {
        success: false,
        error: turnstile.error || 'Bot verification failed.',
      },
      {
        status: turnstile.configured ? 400 : 503,
        headers: {
          ...NO_STORE_HEADERS,
          ...securityHeaders,
        },
      },
    );
  }

  let submission: ReturnType<typeof normalizeSubmission>;

  try {
    submission = normalizeSubmission(body);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'invalid';

    return NextResponse.json(
      {
        success: false,
        error:
          reason === 'consent'
            ? 'Persetujuan pemrosesan data pribadi wajib diberikan.'
            : reason === 'email'
              ? 'Alamat email tidak valid.'
              : 'Data formulir belum lengkap atau tidak valid.',
      },
      {
        status: 400,
        headers: {
          ...NO_STORE_HEADERS,
          ...securityHeaders,
        },
      },
    );
  }

  const score = calculateLeadScore(submission);
  const now = new Date().toISOString();

  const lead: Lead = {
    id: crypto.randomUUID(),
    createdAt: now,
    source: submission.source,
    toolSlug: submission.toolSlug,
    name: submission.name,
    role: submission.role,
    company: submission.company,
    sector: submission.sector,
    email: submission.email,
    whatsapp: submission.whatsapp,
    needSummary: submission.needSummary,
    score,
    status: score >= 70 ? 'Qualified' : 'New',
    consentAt: now,
    consentVersion: CONSENT_VERSION,
  };

  try {
    await createPersistentLead(lead);

    return NextResponse.json(
      {
        success: true,
        lead: {
          id: lead.id,
          createdAt: lead.createdAt,
          score: lead.score,
          status: lead.status,
        },
        database: {
          connected: true,
          persistence: 'cloudflare-d1',
        },
      },
      {
        status: 201,
        headers: {
          ...NO_STORE_HEADERS,
          ...securityHeaders,
        },
      },
    );
  } catch (error) {
    if (!(error instanceof LeadDatabaseUnavailableError)) {
      console.error(
        'Lead persistence failed:',
        error instanceof Error ? error.message : 'unknown database error',
      );
    }

    return databaseErrorResponse(securityHeaders);
  }
}

export async function GET() {
  try {
    const leads = await listPersistentLeads(500);

    return NextResponse.json(
      {
        success: true,
        leads,
        database: {
          connected: true,
          persistence: 'cloudflare-d1',
        },
      },
      {
        status: 200,
        headers: NO_STORE_HEADERS,
      },
    );
  } catch (error) {
    if (!(error instanceof LeadDatabaseUnavailableError)) {
      console.error(
        'Lead query failed:',
        error instanceof Error ? error.message : 'unknown database error',
      );
    }

    return databaseErrorResponse();
  }
}

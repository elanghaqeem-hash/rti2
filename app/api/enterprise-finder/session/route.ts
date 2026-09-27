import { NextResponse } from 'next/server';
import {
  createFinderAssessmentSession,
  FinderDatabaseUnavailableError,
  getFinderConfig,
  getFinderDraft,
  saveFinderDraft,
} from '@/lib/enterprise-finder/repository';
import {
  enforceRateLimit,
  rateLimitHeaders,
} from '@/lib/security/request-protection';
import type {
  FinderAssessmentInput,
  FinderLocale,
} from '@/lib/enterprise-finder/types';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' };

function normalizeLocale(value: unknown): FinderLocale {
  return value === 'en' ? 'en' : 'id';
}

function failure(error: unknown, headers: Record<string, string> = {}) {
  const unavailable = error instanceof FinderDatabaseUnavailableError;
  const invalidToken =
    error instanceof Error && error.message === 'invalid-assessment-token';

  return NextResponse.json(
    {
      success: false,
      error: invalidToken
        ? 'Assessment token tidak valid.'
        : unavailable
          ? 'Database Enterprise Solution Finder belum siap. Jalankan pending migration melalui Admin System Setup.'
          : 'Assessment session tidak dapat diproses.',
    },
    {
      status: invalidToken ? 401 : unavailable ? 503 : 500,
      headers: { ...NO_STORE, ...headers },
    },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const assessmentId = String(url.searchParams.get('id') || '').trim();
  const token = req.headers.get('x-assessment-token') || '';

  if (!assessmentId || !token) {
    return NextResponse.json(
      { success: false, error: 'Assessment ID dan secure token wajib tersedia.' },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const draft = getFinderDraft(assessmentId, token);
    return NextResponse.json(
      { success: true, draft },
      { headers: NO_STORE },
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(req: Request) {
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'enterprise-finder-session',
    limit: 30,
    windowSeconds: 300,
  });
  const headers = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error:
          rateLimit.reason === 'limit-exceeded'
            ? 'Terlalu banyak assessment session. Silakan coba beberapa menit lagi.'
            : 'Proteksi assessment belum siap.',
      },
      {
        status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { ...NO_STORE, ...headers },
      },
    );
  }

  const body = await req.json().catch(() => ({}));

  try {
    const locale = normalizeLocale(body?.locale);
    const config = getFinderConfig(locale);
    const session = createFinderAssessmentSession({
      locale,
      questionnaireVersion: config.questionnaireVersion,
      scoringVersion: config.scoringVersion,
      serviceMappingVersion: config.serviceMappingVersion,
      aiPromptVersion: config.aiPromptVersion,
    });

    return NextResponse.json(
      {
        success: true,
        session: {
          id: session.id,
          resumeToken: session.token,
          createdAt: session.createdAt,
        },
      },
      { status: 201, headers: { ...NO_STORE, ...headers } },
    );
  } catch (error) {
    return failure(error, headers);
  }
}

export async function PUT(req: Request) {
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'enterprise-finder-save',
    limit: 60,
    windowSeconds: 300,
  });
  const headers = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Save limit exceeded. Please retry shortly.' },
      {
        status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { ...NO_STORE, ...headers },
      },
    );
  }

  const body = await req.json().catch(() => null);
  const assessmentId =
    typeof body?.assessmentId === 'string' ? body.assessmentId.trim() : '';
  const token = req.headers.get('x-assessment-token') || '';
  const input =
    body?.input && typeof body.input === 'object'
      ? (body.input as Partial<FinderAssessmentInput>)
      : null;

  if (!assessmentId || !token || !input) {
    return NextResponse.json(
      { success: false, error: 'Assessment ID, token, dan input wajib tersedia.' },
      { status: 400, headers: { ...NO_STORE, ...headers } },
    );
  }

  try {
    const saved = saveFinderDraft(assessmentId, token, input);
    return NextResponse.json(
      { success: true, savedAt: saved.savedAt },
      { headers: { ...NO_STORE, ...headers } },
    );
  } catch (error) {
    return failure(error, headers);
  }
}

import { NextResponse } from 'next/server';
import {
  FinderDatabaseUnavailableError,
  getFinderAssessmentResult,
  recordFinderEvent,
} from '@/lib/enterprise-finder/repository';
import {
  enforceRateLimit,
  rateLimitHeaders,
} from '@/lib/security/request-protection';

export const runtime = 'nodejs';

const ALLOWED_EVENTS = new Set([
  'view_service',
  'open_specialized_tool',
  'build_rfq',
  'request_consultation',
  'request_proposal',
  'print_report',
  'email_results',
]);

export async function POST(req: Request) {
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'enterprise-finder-event',
    limit: 60,
    windowSeconds: 300,
  });
  const headers = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Event rate limit exceeded.' },
      {
        status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { 'Cache-Control': 'no-store', ...headers },
      },
    );
  }

  const body = await req.json().catch(() => null);
  const assessmentId =
    typeof body?.assessmentId === 'string' ? body.assessmentId.trim() : '';
  const eventType =
    typeof body?.eventType === 'string' ? body.eventType.trim() : '';
  const token = req.headers.get('x-assessment-token') || '';

  if (!assessmentId || !token || !ALLOWED_EVENTS.has(eventType)) {
    return NextResponse.json(
      { success: false, error: 'Event payload tidak valid.' },
      { status: 400, headers: { 'Cache-Control': 'no-store', ...headers } },
    );
  }

  try {
    // Token verification is intentionally reused from the result repository path.
    const result = getFinderAssessmentResult(assessmentId, token);
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Assessment result belum tersedia.' },
        { status: 404, headers: { 'Cache-Control': 'no-store', ...headers } },
      );
    }

    const payload =
      body?.payload && typeof body.payload === 'object'
        ? (body.payload as Record<string, unknown>)
        : undefined;

    recordFinderEvent(assessmentId, eventType, payload);

    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store', ...headers } },
    );
  } catch (error) {
    const invalidToken =
      error instanceof Error && error.message === 'invalid-assessment-token';
    const unavailable = error instanceof FinderDatabaseUnavailableError;

    return NextResponse.json(
      {
        success: false,
        error: invalidToken
          ? 'Assessment token tidak valid.'
          : unavailable
            ? 'Database Enterprise Solution Finder belum siap.'
            : 'Event tidak dapat dicatat.',
      },
      {
        status: invalidToken ? 401 : unavailable ? 503 : 500,
        headers: { 'Cache-Control': 'no-store', ...headers },
      },
    );
  }
}

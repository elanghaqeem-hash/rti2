import { NextResponse } from 'next/server';
import { createIsoAssessment, type CreateAssessmentInput } from '@/lib/iso27001/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'iso27001-assessment-create',
    limit: 20,
    windowSeconds: 3600,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error:
          rateLimit.reason === 'limit-exceeded'
            ? 'Terlalu banyak assessment baru. Silakan coba lagi nanti.'
            : 'Proteksi API belum dikonfigurasi untuk production.',
      },
      {
        status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
        headers: {
          'Cache-Control': 'no-store',
          ...rateLimitHeaders(rateLimit),
        },
      },
    );
  }

  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 100_000) {
      return NextResponse.json(
        { success: false, error: 'Assessment payload is too large.' },
        { status: 413, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const body = (await req.json().catch(() => null)) as CreateAssessmentInput | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid assessment payload.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const assessment = createIsoAssessment({
      ...body,
      mode: body.mode === 'full' ? 'full' : 'quick',
    });

    return NextResponse.json(
      { success: true, assessment },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store',
          ...rateLimitHeaders(rateLimit),
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create ISO 27001 assessment.',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

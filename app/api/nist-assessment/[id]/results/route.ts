import { NextResponse } from 'next/server';
import { hasNistAssessmentAccess } from '@/lib/nist/access';
import { getNistAssessment, getStoredNistResult } from '@/lib/nist/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'nist-results',
    limit: 45,
    windowSeconds: 60,
  });
  const rlHeaders = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Results request limit reached.' },
      {
        status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { 'Cache-Control': 'no-store', ...rlHeaders },
      },
    );
  }

  try {
    if (!hasNistAssessmentAccess(req, id)) {
      return NextResponse.json(
        { success: false, error: 'Assessment access denied.' },
        { status: 403, headers: { 'Cache-Control': 'no-store', ...rlHeaders } },
      );
    }

    const assessment = getNistAssessment(id);
    if (assessment.status === 'in_progress') {
      return NextResponse.json(
        {
          success: false,
          error: 'Assessment is not complete yet.',
          assessment,
        },
        { status: 409, headers: { 'Cache-Control': 'no-store', ...rlHeaders } },
      );
    }

    return NextResponse.json(
      {
        success: true,
        assessment,
        result: getStoredNistResult(id),
      },
      { headers: { 'Cache-Control': 'no-store', ...rlHeaders } },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Assessment result not found.' },
      { status: 404, headers: { 'Cache-Control': 'no-store', ...rlHeaders } },
    );
  }
}

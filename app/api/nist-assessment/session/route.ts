import { NextResponse } from 'next/server';
import { getCurrentNistAssessment } from '@/lib/nist/access';
import { listNistAnswers } from '@/lib/nist/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'nist-session',
    limit: 30,
    windowSeconds: 60,
  });
  const rlHeaders = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, assessment: null, error: 'Session request limit reached.' },
      {
        status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { 'Cache-Control': 'no-store', ...rlHeaders },
      },
    );
  }

  try {
    const assessment = getCurrentNistAssessment(req);
    if (!assessment) {
      return NextResponse.json(
        { success: false, assessment: null },
        { status: 404, headers: { 'Cache-Control': 'no-store', ...rlHeaders } },
      );
    }

    const answers = listNistAnswers(assessment.id);
    return NextResponse.json(
      { success: true, assessment, answers },
      { headers: { 'Cache-Control': 'no-store', ...rlHeaders } },
    );
  } catch {
    return NextResponse.json(
      { success: false, assessment: null },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

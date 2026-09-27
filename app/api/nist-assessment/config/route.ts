import { NextResponse } from 'next/server';
import { getNistAssessmentConfig } from '@/lib/nist/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(req: Request) {
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'nist-config',
    limit: 60,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error:
          rateLimit.reason === 'limit-exceeded'
            ? 'Too many configuration requests. Please retry shortly.'
            : 'Public API protection is not configured.',
      },
      {
        status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { ...NO_STORE, ...rateLimitHeaders(rateLimit) },
      },
    );
  }

  try {
    const config = getNistAssessmentConfig();
    return NextResponse.json(
      {
        success: true,
        config,
        disclaimer:
          'RTI NIST Cyber Quick Check is an independent diagnostic tool developed by PT Riset Teknologi Indonesia and aligned with NIST Cybersecurity Framework 2.0. It is not an official NIST certification, audit, accreditation, or endorsement.',
      },
      { headers: { ...NO_STORE, ...rateLimitHeaders(rateLimit) } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'NIST Cyber Quick Check configuration is unavailable.',
      },
      { status: 503, headers: { ...NO_STORE, ...rateLimitHeaders(rateLimit) } },
    );
  }
}

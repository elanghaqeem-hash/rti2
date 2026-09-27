import { NextResponse } from 'next/server';
import { createRfqDraft, verifyEstimatorSessionAccess } from '@/lib/project-estimator/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const limit = await enforceRateLimit(req, { bucket: 'project-rfq-create', limit: 12, windowSeconds: 300 });
  const headers = { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) };
  if (!limit.allowed) return NextResponse.json({ success: false, error: 'RFQ generation is temporarily unavailable or rate limited.' }, { status: limit.reason === 'limit-exceeded' ? 429 : 503, headers });

  const body = await req.json().catch(() => null) as any;
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
  const estimateId = typeof body?.estimateId === 'string' ? body.estimateId.trim() : '';
  const resumeToken = typeof body?.resumeToken === 'string' ? body.resumeToken.trim() : '';
  if (!sessionId || !estimateId || !resumeToken) return NextResponse.json({ success: false, error: 'Session, estimate and access token are required.' }, { status: 400, headers });
  if (!verifyEstimatorSessionAccess(sessionId, resumeToken)) return NextResponse.json({ success: false, error: 'Estimator draft access denied.' }, { status: 403, headers });

  try {
    const rfq = await createRfqDraft({ sessionId, estimateId, useAi: body?.useAi === true });
    return NextResponse.json({ success: true, rfq }, { status: 201, headers });
  } catch (error) {
    console.error('RFQ draft creation failed:', error);
    return NextResponse.json({ success: false, error: 'RFQ draft could not be generated.' }, { status: 422, headers });
  }
}

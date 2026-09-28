import { NextResponse } from 'next/server';
import { calculateEstimatorSession, verifyEstimatorSessionAccess } from '@/lib/project-estimator/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const limit = await enforceRateLimit(req, { bucket: 'project-estimator-calculate', limit: 30, windowSeconds: 300 });
  const headers = { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) };
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: 'Estimator is temporarily unavailable or rate limited.' }, { status: limit.reason === 'limit-exceeded' ? 429 : 503, headers });
  }

  const body = await req.json().catch(() => null) as any;
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
  const resumeToken = typeof body?.resumeToken === 'string' ? body.resumeToken.trim() : '';
  if (!sessionId || !resumeToken) return NextResponse.json({ success: false, error: 'Session access token is required.' }, { status: 400, headers });
  if (!(await verifyEstimatorSessionAccess(sessionId, resumeToken))) return NextResponse.json({ success: false, error: 'Estimator draft access denied.' }, { status: 403, headers });

  try {
    const estimate = await calculateEstimatorSession(sessionId);
    const { trace: _internalTrace, ...publicEstimate } = estimate;
    return NextResponse.json({ success: true, estimate: publicEstimate }, { headers });
  } catch (error) {
    console.error('Estimator calculation failed:', error);
    return NextResponse.json({ success: false, error: 'We could not calculate your estimate. Your saved information remains available.' }, { status: 422, headers });
  }
}

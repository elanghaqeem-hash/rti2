import { NextResponse } from 'next/server';
import { listEstimatorRiskFlags } from '@/lib/project-estimator/risk';
import { verifyEstimatorSessionAccess } from '@/lib/project-estimator/repository';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = String(url.searchParams.get('sessionId') || '').trim();
  const resumeToken = String(req.headers.get('x-rti-resume-token') || '').trim();

  if (!sessionId || !resumeToken) {
    return NextResponse.json({ success: false, error: 'Session access token is required.' }, { status: 400 });
  }
  if (!(await verifyEstimatorSessionAccess(sessionId, resumeToken))) {
    return NextResponse.json({ success: false, error: 'Estimator draft access denied.' }, { status: 403 });
  }

  return NextResponse.json(
    { success: true, riskFlags: await listEstimatorRiskFlags(sessionId) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

import { NextResponse } from 'next/server';
import { submitRfq, verifyRfqAccess } from '@/lib/project-estimator/repository';
import { enforceRateLimit, rateLimitHeaders, verifyTurnstile } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const limit = await enforceRateLimit(req, { bucket: 'project-rfq-submit', limit: 8, windowSeconds: 300 });
  const headers = { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) };
  if (!limit.allowed) return NextResponse.json({ success: false, error: 'RFQ submission is temporarily unavailable or rate limited.' }, { status: limit.reason === 'limit-exceeded' ? 429 : 503, headers });

  const body = await req.json().catch(() => null) as any;
  const { id } = await context.params;
  if (!(await verifyRfqAccess(id, String(body?.resumeToken || '')))) return NextResponse.json({ success: false, error: 'RFQ access denied.' }, { status: 403, headers });
  if (body?.consent !== true) return NextResponse.json({ success: false, error: 'Privacy consent is required before RFQ submission.' }, { status: 400, headers });
  const turnstile = await verifyTurnstile(req, body?.turnstileToken);
  if (!turnstile.success) return NextResponse.json({ success: false, error: turnstile.error || 'Bot verification failed.' }, { status: turnstile.configured ? 400 : 503, headers });

  try {
    const rfq = await submitRfq(id);
    return NextResponse.json({ success: true, rfq, message: 'RFQ submitted to RTI for review.' }, { headers });
  } catch (error) {
    console.error('RFQ submission failed:', error);
    return NextResponse.json({ success: false, error: 'RFQ could not be submitted. Please retry.' }, { status: 422, headers });
  }
}

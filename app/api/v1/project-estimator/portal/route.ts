import { NextResponse } from 'next/server';
import { addPortalMessage, getPortalSession } from '@/lib/project-estimator/studio';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const resumeToken = String(req.headers.get('x-rti-resume-token') || '').trim();
  if (!resumeToken) {
    return NextResponse.json(
      { success: false, error: 'Portal access token is required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  try {
    return NextResponse.json(
      { success: true, portal: await getPortalSession(resumeToken) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Portal session not found or access token invalid.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function POST(req: Request) {
  const limit = await enforceRateLimit(req, {
    bucket: 'project-estimator-portal-message',
    limit: 20,
    windowSeconds: 300,
  });
  const headers = { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) };
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: limit.reason === 'limit-exceeded' ? 'Message limit reached.' : 'API protection unavailable.' },
      { status: limit.reason === 'limit-exceeded' ? 429 : 503, headers },
    );
  }

  const body = await req.json().catch(() => null) as any;
  const resumeToken = String(body?.resumeToken || '').trim();
  const content = String(body?.content || '').trim();
  if (!resumeToken || !content) {
    return NextResponse.json({ success: false, error: 'Token and message are required.' }, { status: 400, headers });
  }
  try {
    await addPortalMessage({
      resumeToken,
      content,
      senderName: typeof body.senderName === 'string' ? body.senderName : undefined,
    });
    return NextResponse.json(
      { success: true, portal: await getPortalSession(resumeToken) },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Message could not be saved.' },
      { status: 422, headers },
    );
  }
}

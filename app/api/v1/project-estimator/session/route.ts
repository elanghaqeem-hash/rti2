import { NextResponse } from 'next/server';
import { getEstimatorSessionByToken, upsertEstimatorSession, validateEstimatorSessionInput } from '@/lib/project-estimator/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';
import type { SessionInput } from '@/lib/project-estimator/types';

export const runtime = 'nodejs';

function validText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function GET(req: Request) {
  const limit = await enforceRateLimit(req, { bucket: 'project-estimator-resume', limit: 30, windowSeconds: 300 });
  const headers = { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) };
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: 'Saved draft lookup is temporarily unavailable or rate limited.' }, { status: limit.reason === 'limit-exceeded' ? 429 : 503, headers });
  }
  const token = req.headers.get('x-rti-resume-token')?.trim() || new URL(req.url).searchParams.get('token')?.trim() || '';
  if (!token) return NextResponse.json({ success: false, error: 'Resume token is required.' }, { status: 400, headers });
  try {
    return NextResponse.json({ success: true, ...getEstimatorSessionByToken(token) }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: 'Saved estimator draft was not found or is no longer available.' }, { status: 404, headers });
  }
}

export async function POST(req: Request) {
  const limit = await enforceRateLimit(req, { bucket: 'project-estimator-session', limit: 30, windowSeconds: 300 });
  const headers = { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) };
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: 'Estimator is temporarily unavailable or rate limited.' }, { status: limit.reason === 'limit-exceeded' ? 429 : 503, headers });
  }

  const body = await req.json().catch(() => null) as any;
  const input = body?.input as SessionInput | undefined;
  if (!input || !['quick','detailed'].includes(input.mode) || !validText(input.projectName, 180) ||
      !validText(input.serviceId, 80) || !validText(input.profile?.companyName, 180) ||
      !validText(input.profile?.industry, 120) || !validText(input.profile?.contactName, 120) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validText(input.profile?.email, 254))) {
    return NextResponse.json({ success: false, error: 'Required project and contact information is incomplete or invalid.' }, { status: 400, headers });
  }

  try {
    const validationErrors = validateEstimatorSessionInput(input);
    if (validationErrors.length) {
      return NextResponse.json(
        { success: false, error: validationErrors[0], details: validationErrors },
        { status: 400, headers },
      );
    }
    const result = upsertEstimatorSession(input, validText(body?.sessionId, 80) || undefined, validText(body?.resumeToken, 256) || undefined);
    return NextResponse.json({ success: true, ...result }, { status: 201, headers });
  } catch (error) {
    console.error('Estimator session persistence failed:', error);
    return NextResponse.json({ success: false, error: 'Your project information could not be saved. Please retry.' }, { status: 503, headers });
  }
}

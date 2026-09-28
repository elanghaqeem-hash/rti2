import { NextResponse } from 'next/server';
import { runEstimatorCopilot } from '@/lib/project-estimator/copilot';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const limit = await enforceRateLimit(req, {
    bucket: 'project-estimator-copilot',
    limit: 20,
    windowSeconds: 300,
  });
  const headers = {
    'Cache-Control': 'no-store',
    ...rateLimitHeaders(limit),
  };
  if (!limit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error:
          limit.reason === 'limit-exceeded'
            ? 'AI Scoping Copilot mencapai batas sementara. Silakan coba lagi sebentar.'
            : 'Proteksi API belum siap.',
      },
      { status: limit.reason === 'limit-exceeded' ? 429 : 503, headers },
    );
  }

  const body = (await req.json().catch(() => null)) as any;
  const sessionId = String(body?.sessionId || '').trim();
  const resumeToken = String(body?.resumeToken || '').trim();
  const message = String(body?.message || '').trim();

  if (!sessionId || !resumeToken || !message) {
    return NextResponse.json(
      { success: false, error: 'Session, access token, and message are required.' },
      { status: 400, headers },
    );
  }
  if (message.length > 4000) {
    return NextResponse.json(
      { success: false, error: 'Message is too long.' },
      { status: 400, headers },
    );
  }

  try {
    const result = await runEstimatorCopilot({
      sessionId,
      resumeToken,
      message,
    });
    return NextResponse.json({ success: true, ...result }, { headers });
  } catch (error) {
    console.error(
      'Estimator Copilot failed:',
      error instanceof Error ? error.message : String(error),
    );
    const reason = error instanceof Error ? error.message : '';
    const status = /access denied|mismatch/i.test(reason) ? 403 : 422;
    return NextResponse.json(
      {
        success: false,
        error:
          status === 403
            ? 'Estimator draft access denied.'
            : 'Copilot tidak dapat memproses scope saat ini. Data estimator Anda tetap aman.',
      },
      { status, headers },
    );
  }
}

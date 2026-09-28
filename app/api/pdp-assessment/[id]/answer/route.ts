import { NextResponse } from 'next/server';
import { hasPdpAssessmentAccess } from '@/lib/pdp/access';
import { savePdpAnswerRuntime } from '@/lib/pdp/runtime-repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!(await hasPdpAssessmentAccess(req, id))) {
    return NextResponse.json(
      { success: false, error: 'Assessment access denied.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const limit = await enforceRateLimit(req, {
    bucket: 'pdp-readiness-answer',
    limit: 240,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak perubahan jawaban. Silakan coba kembali nanti.' },
      {
        status: limit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) },
      },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('Invalid answer payload.');
    }
    const value = body as Record<string, unknown>;

    const answer = await savePdpAnswerRuntime({
      assessmentId: id,
      questionId: String(value.questionId || '').trim(),
      answerValue: String(value.answerValue || '').trim(),
      evidenceStatus: String(value.evidenceStatus || 'none').trim(),
      applicabilityJustification: String(value.applicabilityJustification || ''),
      evidenceNote: String(value.evidenceNote || ''),
      comment: String(value.comment || ''),
    });

    return NextResponse.json(
      { success: true, answer },
      { headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Jawaban tidak dapat disimpan.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

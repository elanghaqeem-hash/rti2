import { NextResponse } from 'next/server';
import { loadPdpAssessment } from '@/lib/pdp/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenFrom(req: Request) {
  const header = req.headers.get('authorization') || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, {
    bucket: 'pdp-export',
    limit: 10,
    windowSeconds: 60,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { success: false, error: 'Export is temporarily unavailable.' },
      {
        status: limited.reason === 'limit-exceeded' ? 429 : 503,
        headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) },
      },
    );
  }

  const url = new URL(req.url);
  const assessmentId = String(url.searchParams.get('id') || '').slice(0, 80);
  const token = tokenFrom(req);

  if (!assessmentId || !token) {
    return NextResponse.json(
      { success: false, error: 'Assessment id and resume token are required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }

  try {
    const assessment = loadPdpAssessment(assessmentId, token);
    if (!assessment) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found or resume token is invalid.' },
        { status: 404, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
      );
    }

    const safeExport = {
      exportedAt: new Date().toISOString(),
      assessment: {
        id: assessment.id,
        mode: assessment.mode,
        status: assessment.status,
        assessmentDate: assessment.assessmentDate,
        completionDate: assessment.completionDate,
        questionSetVersion: assessment.questionSetVersion,
        regulationVersion: assessment.regulationVersion,
        scoringModelVersion: assessment.scoringModelVersion,
        profile: assessment.profile,
        responses: assessment.responses,
        result: assessment.result,
      },
      excluded: [
        'resume token',
        'evidence file bytes',
        'server storage paths',
        'internal security metadata',
      ],
    };

    return new NextResponse(JSON.stringify(safeExport, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="RTI-UU-PDP-Assessment-Export.json"',
        'Cache-Control': 'private, no-store',
        ...rateLimitHeaders(limited),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to export assessment.' },
      { status: 503, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }
}

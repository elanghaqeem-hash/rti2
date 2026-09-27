import { NextResponse } from 'next/server';
import {
  getPdpScoringConfig,
  loadPdpAssessment,
  savePdpResponses,
  savePdpResult,
} from '@/lib/pdp/repository';
import { scorePdpAssessment } from '@/lib/pdp/scoring';
import type { PdpResponseInput } from '@/lib/pdp/types';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenFrom(req: Request) {
  const header = req.headers.get('authorization') || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, {
    bucket: 'pdp-score',
    limit: 20,
    windowSeconds: 60,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { success: false, error: 'Assessment scoring is temporarily unavailable.' },
      {
        status: limited.reason === 'limit-exceeded' ? 429 : 503,
        headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) },
      },
    );
  }

  const body = await req.json().catch(() => null);
  const assessmentId = String(body?.assessmentId || '').slice(0, 80);
  const token = tokenFrom(req);

  if (!assessmentId || !token) {
    return NextResponse.json(
      { success: false, error: 'Assessment id and resume token are required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }

  try {
    if (Array.isArray(body?.responses) && body.responses.length > 0) {
      savePdpResponses(
        assessmentId,
        token,
        body.responses.slice(0, 180) as PdpResponseInput[],
      );
    }

    const assessment = loadPdpAssessment(assessmentId, token);
    if (!assessment) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found or resume token is invalid.' },
        { status: 404, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
      );
    }

    const result = scorePdpAssessment({
      questions: assessment.questions,
      responses: assessment.responses,
      profile: assessment.profile,
      scoring: getPdpScoringConfig(),
    });

    savePdpResult(assessmentId, token, result);

    return NextResponse.json(
      {
        success: true,
        result,
        versions: {
          questionSet: assessment.questionSetVersion,
          regulation: assessment.regulationVersion,
          scoringModel: assessment.scoringModelVersion,
        },
      },
      { headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to score assessment.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }
}

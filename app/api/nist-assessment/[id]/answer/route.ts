import { NextResponse } from 'next/server';
import { getApplicableNistQuestionIds } from '@/lib/nist/engine';
import { hasNistAssessmentAccess } from '@/lib/nist/access';
import {
  getNistAssessmentConfig,
  listNistAnswers,
  saveNistAnswer,
} from '@/lib/nist/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';
import type { NistEvidenceStatus } from '@/lib/nist/types';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const EVIDENCE = new Set<NistEvidenceStatus>([
  'available',
  'partial',
  'none',
  'unspecified',
]);

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'nist-answer',
    limit: 120,
    windowSeconds: 60,
  });
  const rlHeaders = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Assessment request limit reached.' },
      {
        status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { ...NO_STORE, ...rlHeaders },
      },
    );
  }

  try {
    if (!hasNistAssessmentAccess(req, id)) {
      return NextResponse.json(
        { success: false, error: 'Assessment access denied.' },
        { status: 403, headers: { ...NO_STORE, ...rlHeaders } },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid answer payload.' },
        { status: 400, headers: { ...NO_STORE, ...rlHeaders } },
      );
    }

    const value = body as Record<string, unknown>;
    const questionId = String(value.questionId || '').trim().slice(0, 120);
    const answerValue = String(value.answerValue || '').trim().slice(0, 40);
    const evidenceStatus = String(
      value.evidenceStatus || 'unspecified',
    ) as NistEvidenceStatus;
    const comment = String(value.comment || '').trim().slice(0, 2000);

    if (!questionId || !answerValue || !EVIDENCE.has(evidenceStatus)) {
      return NextResponse.json(
        { success: false, error: 'Question, answer, or evidence status is invalid.' },
        { status: 400, headers: { ...NO_STORE, ...rlHeaders } },
      );
    }

    const answer = saveNistAnswer(id, {
      questionId,
      answerValue,
      evidenceStatus,
      comment,
    });
    const config = getNistAssessmentConfig();
    const answers = listNistAnswers(id);
    const applicableIds = getApplicableNistQuestionIds(config, answers);
    const answeredIds = new Set(answers.map((item) => item.questionId));
    const applicableAnswered = applicableIds.filter((questionId) =>
      answeredIds.has(questionId),
    ).length;

    return NextResponse.json(
      {
        success: true,
        answer,
        progress: {
          answered: applicableAnswered,
          total: applicableIds.length,
          percent: Math.round((applicableAnswered / Math.max(applicableIds.length, 1)) * 100),
        },
      },
      { headers: { ...NO_STORE, ...rlHeaders } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save answer.';
    const status =
      /not found|not valid|cannot be modified/i.test(message) ? 400 : 503;

    return NextResponse.json(
      { success: false, error: message },
      { status, headers: { ...NO_STORE, ...rlHeaders } },
    );
  }
}

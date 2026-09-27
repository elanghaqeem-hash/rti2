import { NextResponse } from 'next/server';
import { hasNistAssessmentAccess } from '@/lib/nist/access';
import { getApplicableNistQuestionIds, scoreNistAssessment } from '@/lib/nist/engine';
import {
  getNistAssessment,
  getNistAssessmentConfig,
  getStoredNistResult,
  listNistAnswers,
  persistNistResult,
} from '@/lib/nist/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'nist-complete',
    limit: 15,
    windowSeconds: 300,
  });
  const rlHeaders = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Assessment completion request limit reached.' },
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

    const assessment = getNistAssessment(id);
    if (assessment.status !== 'in_progress') {
      return NextResponse.json(
        { success: true, result: getStoredNistResult(id), idempotent: true },
        { headers: { ...NO_STORE, ...rlHeaders } },
      );
    }

    const config = getNistAssessmentConfig({
      frameworkVersion: assessment.frameworkVersion,
      questionnaireVersion: assessment.questionnaireVersion,
    });
    const answers = listNistAnswers(id);
    const answered = new Set(answers.map((answer) => answer.questionId));
    const applicableIds = getApplicableNistQuestionIds(config, answers);
    const missing = applicableIds.filter((questionId) => !answered.has(questionId));

    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Complete all required Quick Check questions before calculating the Cyber Readiness Score.',
          missingQuestionIds: missing,
          progress: {
            answered: applicableIds.filter((questionId) => answered.has(questionId)).length,
            total: applicableIds.length,
          },
        },
        { status: 409, headers: { ...NO_STORE, ...rlHeaders } },
      );
    }

    const result = scoreNistAssessment({
      assessmentId: id,
      config,
      answers,
    });
    persistNistResult(id, result);

    return NextResponse.json(
      {
        success: true,
        result,
        scoring: {
          engine: 'RTI NIST Cyber Quick Check',
          frameworkVersion: assessment.frameworkVersion,
          questionnaireVersion: assessment.questionnaireVersion,
          scoringModelVersion: assessment.scoringModelVersion,
          recommendationVersion: assessment.recommendationVersion,
          calculatedServerSide: true,
        },
      },
      { headers: { ...NO_STORE, ...rlHeaders } },
    );
  } catch (error) {
    console.error(
      'NIST assessment completion failed:',
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { success: false, error: 'Unable to complete this assessment.' },
      { status: 503, headers: { ...NO_STORE, ...rlHeaders } },
    );
  }
}

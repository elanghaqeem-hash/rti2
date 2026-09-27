import { NextResponse } from 'next/server';
import { generateAiWithFailover } from '@/lib/ai/provider-router';
import { hasNistAssessmentAccess } from '@/lib/nist/access';
import { getNistAssessment, getStoredNistResult } from '@/lib/nist/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are RTI Cyber Advisor, an executive cybersecurity advisory assistant for PT Riset Teknologi Indonesia.

Use only the structured NIST Cyber Quick Check result supplied in context.
Never modify, reinterpret, or invent raw scores, answers, evidence, framework mappings, regulatory obligations, or service facts.
Never claim NIST certification, official NIST assessment, legal compliance, audit assurance, or guaranteed security.
This is a self-assessment diagnostic. Clearly distinguish reported posture from verified evidence.
If the data is insufficient for a definitive conclusion, say: "Insufficient information for a definitive conclusion."

Produce concise professional sections:
1. Executive Summary
2. Key Findings
3. Key Risks
4. Management Implications
5. Recommended Priorities
6. 30/60/90-Day Focus
7. Relevant RTI Services

Do not hard-sell. Recommend an RTI service only where the structured result contains a mapped recommendation.`;

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'nist-advisor',
    limit: 6,
    windowSeconds: 300,
  });
  const rlHeaders = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'RTI Cyber Advisor request limit reached.' },
      {
        status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { 'Cache-Control': 'no-store', ...rlHeaders },
      },
    );
  }

  try {
    if (!hasNistAssessmentAccess(req, id)) {
      return NextResponse.json(
        { success: false, error: 'Assessment access denied.' },
        { status: 403, headers: { 'Cache-Control': 'no-store', ...rlHeaders } },
      );
    }

    const assessment = getNistAssessment(id);
    const result = getStoredNistResult(id);

    const safeContext = {
      organization: {
        companyName: assessment.organization.companyName,
        industry: assessment.organization.industry,
        companySize: assessment.organization.companySize,
        technologyContext: assessment.organization.technologyContext,
      },
      frameworkVersion: assessment.frameworkVersion,
      questionnaireVersion: assessment.questionnaireVersion,
      overallScore: result.overallScore,
      riskRating: result.riskRating,
      confidenceScore: result.confidenceScore,
      indicativeTier: result.indicativeTier,
      functionScores: result.functionScores,
      topGaps: result.gaps,
      topFindings: result.findings.slice(0, 8),
      recommendations: result.recommendations.slice(0, 10),
      roadmap: result.roadmap.slice(0, 12),
      disclaimer: result.methodologyDisclaimer,
    };

    const ai = await generateAiWithFailover({
      messages: [
        {
          role: 'user',
          content:
            'Prepare the executive advisory analysis using the structured assessment context. Do not infer facts not present in the context.',
        },
      ],
      systemPrompt: SYSTEM_PROMPT,
      contextText: JSON.stringify(safeContext),
    });

    if (!ai) {
      const topGap = result.gaps[0];
      const fallback = [
        `Executive Summary: RTI Cyber Readiness Score is ${result.overallScore}/100 with ${result.riskRating} posture and ${result.confidenceScore}% assessment confidence.`,
        topGap
          ? `Key Priority: ${topGap.categoryCode} — ${topGap.categoryName} has a ${topGap.gap}-point gap against the configured target profile.`
          : 'Key Priority: No category gap is available from the stored result.',
        'Management Implication: Treat this result as an initial self-assessment. Validate material findings with supporting evidence before making assurance or compliance conclusions.',
        'Insufficient information for a definitive conclusion.',
      ].join('\n\n');

      return NextResponse.json(
        {
          success: true,
          available: false,
          provider: 'deterministic-fallback',
          text: fallback,
        },
        { headers: { 'Cache-Control': 'no-store', ...rlHeaders } },
      );
    }

    return NextResponse.json(
      {
        success: true,
        available: true,
        provider: ai.provider,
        attempted: ai.attempted,
        text: ai.text,
      },
      { headers: { 'Cache-Control': 'no-store', ...rlHeaders } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'RTI Cyber Advisor could not analyze this assessment.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store', ...rlHeaders } },
    );
  }
}

import { NextResponse } from 'next/server';
import { generateAiWithFailover } from '@/lib/ai/provider-router';
import {
  getIsoAiAnalysisContext,
  getIsoAiProviderRuntimeConfig,
  recordIsoAiAnalysis,
} from '@/lib/iso27001/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limit = await enforceRateLimit(req, {
    bucket: 'iso27001-ai-evidence',
    limit: 20,
    windowSeconds: 3600,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'AI evidence analysis is temporarily unavailable.' },
      {
        status: limit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) },
      },
    );
  }

  try {
    const { id } = await context.params;
    const token = req.headers.get('x-assessment-token')?.trim() || '';
    const body = await req.json().catch(() => null);
    const targetRef = String(body?.targetRef || '').trim();
    if (!targetRef) throw new Error('targetRef is required.');

    const contextData = getIsoAiAnalysisContext(id, token, targetRef);
    const providers = getIsoAiProviderRuntimeConfig();
    if (providers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI analysis is disabled by RTI Admin. Manual evidence review remains available.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) } },
      );
    }

    const ai = await generateAiWithFailover({
      systemPrompt:
        'You are RTI ISO/IEC 27001 readiness evidence assistant. Analyze only the supplied assessment context and evidence. Do not change or assign the official deterministic score. Return concise sections: Suggested Observation, Evidence Adequacy, Potential Gap, Recommended Action, and Limitations. Never claim certification or compliance. If evidence content is unavailable, state that limitation explicitly.',
      contextText: JSON.stringify(contextData).slice(0, 50000),
      providers,
      messages: [
        {
          role: 'user',
          content:
            'Review the evidence and current response for this assessment item. Produce an advisory suggestion for user review. The user must Accept, Modify, or Reject it before it becomes part of the assessment.',
        },
      ],
    });

    if (!ai) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI analysis is currently unavailable. Manual evidence review remains available.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) } },
      );
    }

    recordIsoAiAnalysis(id, token, targetRef, ai.provider);

    return NextResponse.json(
      {
        success: true,
        suggestion: {
          text: ai.text,
          provider: ai.provider,
          scoringChanged: false,
          reviewRequired: true,
          limitations: contextData.limitations,
        },
      },
      { headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'AI evidence analysis failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) } },
    );
  }
}

import { NextResponse } from 'next/server';
import { generateAiWithFailover } from '@/lib/ai/provider-router';
import { getPdpAiPrompt, loadPdpAssessment } from '@/lib/pdp/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `Anda adalah RTI Privacy Advisor untuk tool UU PDP Data Protection Readiness.
Gunakan HANYA fakta assessment dan regulatory context yang diberikan.
Jangan menyatakan organisasi pasti patuh/tidak patuh.
Jangan mengarang nomor pasal, kewajiban hukum, regulator, sanksi, atau fakta lain yang tidak ada di context.
Bedakan dengan jelas:
FACT
ASSESSMENT RESULT
AI ANALYSIS
RECOMMENDATION
REQUIRES HUMAN VALIDATION
Fokus pada gap terbesar, red flags, evidence confidence, DPIA/DPO screening, dan roadmap yang actionable.
Rekomendasi layanan RTI adalah layer komersial terpisah dan tidak boleh memengaruhi score.
Gunakan bahasa Indonesia profesional, ringkas, dan cocok untuk Direksi/Legal/Compliance/Risk/IT.`;

function tokenFrom(req: Request) {
  const header = req.headers.get('authorization') || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

function deterministicSummary(result: NonNullable<ReturnType<typeof loadPdpAssessment>>['result']) {
  if (!result) return 'Assessment belum memiliki hasil scoring.';
  const critical = result.criticalFindings.slice(0, 5).map((item) => item.domain + ': ' + item.gap);
  const weakDomains = [...result.domainScores]
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map((item) => item.name + ' (' + item.score + '%)');

  return [
    'FACT',
    '- Baseline regulatory reference: UU No. 27 Tahun 2022.',
    '',
    'ASSESSMENT RESULT',
    '- Overall readiness: ' + result.overallScore + '%.',
    '- Maturity: Level ' + result.maturityLevel + ' — ' + result.maturityLabel + '.',
    '- Evidence confidence: ' + result.evidenceConfidence + '%.',
    '- DPIA screening: ' + result.dpia.status + '.',
    '- DPO screening: ' + result.dpo.status + '.',
    '',
    'AI ANALYSIS',
    '- Weakest domains: ' + (weakDomains.join(', ') || 'No domain data available') + '.',
    '- Critical gaps: ' + (critical.join(' | ') || 'No critical finding generated from current responses') + '.',
    '',
    'RECOMMENDATION',
    '- Prioritaskan Critical/High findings, tetapkan owner, evidence target, dan milestone 30/90/180 hari.',
    '- Validasi N/A, jawaban unverified, serta regulatory applicability sebelum keputusan kepatuhan dibuat.',
    '',
    'REQUIRES HUMAN VALIDATION',
    '- Interpretasi kewajiban hukum, applicability sektoral, dan kecukupan bukti harus direview oleh fungsi Legal/Privacy/Compliance yang berwenang.',
  ].join('\n');
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, {
    bucket: 'pdp-ai-advisor',
    limit: 10,
    windowSeconds: 60,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      { success: false, error: 'AI advisor is temporarily unavailable.' },
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
    const assessment = loadPdpAssessment(assessmentId, token);
    if (!assessment || !assessment.result) {
      return NextResponse.json(
        { success: false, error: 'Complete the assessment before requesting AI analysis.' },
        { status: 409, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
      );
    }

    const result = assessment.result;
    const context = {
      organizationProfile: {
        industry: assessment.profile.industry,
        organizationSize: assessment.profile.organizationSize,
        crossBorderOperations: assessment.profile.crossBorderOperations,
        internationalTransfer: assessment.profile.internationalTransfer,
        childrenData: assessment.profile.childrenData,
        healthData: assessment.profile.healthData,
        biometricData: assessment.profile.biometricData,
        automatedDecisionMaking: assessment.profile.automatedDecisionMaking,
        profiling: assessment.profile.profiling,
      },
      versions: {
        questionSet: assessment.questionSetVersion,
        regulation: assessment.regulationVersion,
        scoringModel: assessment.scoringModelVersion,
      },
      result: {
        overallScore: result.overallScore,
        maturityLevel: result.maturityLevel,
        maturityLabel: result.maturityLabel,
        evidenceConfidence: result.evidenceConfidence,
        completion: result.completion,
        domainScores: result.domainScores,
        criticalFindings: result.criticalFindings.slice(0, 10),
        topRisks: result.topRisks.slice(0, 8),
        dpia: result.dpia,
        dpo: result.dpo,
        roadmap: result.roadmap.slice(0, 12),
      },
      allowedRegulatoryContext: [
        'UU No. 27 Tahun 2022 is the baseline reference stored in the RTI regulatory knowledge base.',
        'The tool is a diagnostic readiness indicator, not a certification, audit opinion, or legal opinion.',
        'The tool includes breach-readiness evaluation for the 3x24-hour notification workflow specified in the assessment baseline.',
      ],
    };

    const configuredPrompt = getPdpAiPrompt('executive-analysis');
    const ai = await generateAiWithFailover({
      messages: [
        {
          role: 'user',
          content:
            'Buat executive privacy analysis berdasarkan assessment context. Jangan menambah fakta regulasi di luar context.',
        },
      ],
      systemPrompt:
        SYSTEM_PROMPT +
        '\n\nADMIN-MANAGED ANALYSIS INSTRUCTION\n' +
        (configuredPrompt?.promptText || 'Prioritize material gaps and actionable remediation.'),
      contextText: JSON.stringify(context),
    });

    return NextResponse.json(
      {
        success: true,
        analysis: ai?.text || deterministicSummary(result),
        provider: ai?.provider || 'deterministic',
        requiresHumanValidation: true,
      },
      { headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to generate privacy analysis.' },
      { status: 503, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }
}

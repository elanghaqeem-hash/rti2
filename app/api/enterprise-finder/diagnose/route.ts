import { NextResponse } from 'next/server';
import { generateAiWithFailover } from '@/lib/ai/provider-router';
import { diagnoseEnterpriseFinder } from '@/lib/enterprise-finder/engine';
import {
  completeFinderAssessmentRuntime,
  FinderRuntimeDatabaseUnavailableError,
  getFinderConfigRuntime,
  getFinderEngineDataRuntime,
} from '@/lib/enterprise-finder/runtime-repository';
import type {
  CapabilityStatus,
  FinderAssessmentInput,
  FinderConfig,
  FinderLocale,
  FinderPressureRating,
} from '@/lib/enterprise-finder/types';
import {
  enforceRateLimit,
  rateLimitHeaders,
} from '@/lib/security/request-protection';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' };
const CAPABILITY_STATUSES = new Set<CapabilityStatus>([
  'fully_implemented',
  'partially_implemented',
  'planned',
  'unknown',
  'not_implemented',
]);

function limitedText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function numberOrUndefined(value: unknown, min = 0, max = 1_000_000) {
  if (value === '' || value === null || value === undefined) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return Math.max(min, Math.min(max, Math.trunc(num)));
}

function stringArray(value: unknown, maxItems = 50) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, maxItems);
}

function rating(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.max(1, Math.min(5, num));
}

function normalizeInput(
  raw: unknown,
  locale: FinderLocale,
  allowed: {
    industries: Set<string>;
    scales: Set<string>;
    regulated: Set<string>;
    infrastructure: Set<string>;
    dependencies: Set<string>;
    itTeams: Set<string>;
    cyberTeams: Set<string>;
    capabilities: Set<string>;
    pressures: Set<string>;
    objectives: Set<string>;
    timelines: Set<string>;
    deliveries: Set<string>;
    triggers: Set<string>;
  },
): FinderAssessmentInput {
  if (!raw || typeof raw !== 'object') throw new Error('invalid-input');
  const value = raw as Record<string, any>;
  const org = value.organization || {};
  const tech = value.technology || {};

  const industry = limitedText(org.industry, 120);
  const organizationScale = limitedText(org.organizationScale, 120);
  const regulatedStatus = limitedText(org.regulatedStatus, 40);
  const digitalDependency = limitedText(tech.digitalDependency, 80);
  const itTeamSize = limitedText(tech.itTeamSize, 80);
  const cyberTeam = limitedText(tech.cyberTeam, 80);
  const targetTimeline = limitedText(value.targetTimeline, 80);
  const deliveryPreference = limitedText(value.deliveryPreference, 80);

  if (
    !allowed.industries.has(industry) ||
    !allowed.scales.has(organizationScale) ||
    !allowed.regulated.has(regulatedStatus) ||
    !allowed.dependencies.has(digitalDependency) ||
    !allowed.itTeams.has(itTeamSize) ||
    !allowed.cyberTeams.has(cyberTeam) ||
    !allowed.timelines.has(targetTimeline) ||
    !allowed.deliveries.has(deliveryPreference)
  ) {
    throw new Error('invalid-input');
  }

  const infrastructure = stringArray(tech.infrastructure, 10).filter((item) =>
    allowed.infrastructure.has(item),
  );
  if (infrastructure.length === 0) throw new Error('invalid-input');

  const capabilities: Record<string, CapabilityStatus> = {};
  if (tech.capabilities && typeof tech.capabilities === 'object') {
    for (const [key, status] of Object.entries(tech.capabilities)) {
      if (!allowed.capabilities.has(key)) continue;
      if (typeof status !== 'string' || !CAPABILITY_STATUSES.has(status as CapabilityStatus)) {
        continue;
      }
      capabilities[key] = status as CapabilityStatus;
    }
  }

  const pressures: FinderPressureRating[] = Array.isArray(value.pressures)
    ? value.pressures
        .filter((item: any) => item && allowed.pressures.has(String(item.key || '')))
        .slice(0, 20)
        .map((item: any) => ({
          key: String(item.key),
          severity: rating(item.severity),
          urgency: rating(item.urgency),
          businessImpact: rating(item.businessImpact),
          regulatoryImpact: rating(item.regulatoryImpact),
          cyberRisk: rating(item.cyberRisk),
          operationalImpact: rating(item.operationalImpact),
        }))
    : [];

  if (pressures.length === 0) throw new Error('invalid-input');

  const objectives = stringArray(value.objectives, 10).filter((item) =>
    allowed.objectives.has(item),
  );
  if (objectives.length === 0) throw new Error('invalid-input');

  const triggerAnswers: Record<string, string[]> = {};
  if (value.triggerAnswers && typeof value.triggerAnswers === 'object') {
    for (const [key, answers] of Object.entries(value.triggerAnswers)) {
      if (!allowed.triggers.has(key)) continue;
      triggerAnswers[key] = stringArray(answers, 20);
    }
  }

  return {
    locale,
    organization: {
      companyName: limitedText(org.companyName, 180) || undefined,
      industry,
      subIndustry: limitedText(org.subIndustry, 160) || undefined,
      organizationType: limitedText(org.organizationType, 160) || undefined,
      location: limitedText(org.location, 180) || undefined,
      branchCount: numberOrUndefined(org.branchCount),
      employeeCount: numberOrUndefined(org.employeeCount),
      itUsers: numberOrUndefined(org.itUsers),
      endpointCount: numberOrUndefined(org.endpointCount),
      revenueCategory: limitedText(org.revenueCategory, 100) || undefined,
      regulatedStatus,
      maturityStage: limitedText(org.maturityStage, 100) || undefined,
      organizationScale,
    },
    technology: {
      infrastructure,
      digitalDependency,
      itTeamSize,
      cyberTeam,
      applications: numberOrUndefined(tech.applications),
      servers: numberOrUndefined(tech.servers),
      databases: numberOrUndefined(tech.databases),
      thirdParties: numberOrUndefined(tech.thirdParties),
      criticalApplications: numberOrUndefined(tech.criticalApplications),
      capabilities,
    },
    pressures,
    triggerAnswers,
    objectives,
    targetTimeline,
    deliveryPreference,
  };
}

function valuesFor(config: FinderConfig, questionKey: string) {
  return new Set(
    config.questions
      .find((question) => question.key === questionKey)
      ?.options.map((option) => option.value) || [],
  );
}

function errorResponse(
  error: unknown,
  headers: Record<string, string>,
) {
  const message = error instanceof Error ? error.message : '';
  const invalidToken = message === 'invalid-assessment-token';
  const invalidInput = message === 'invalid-input';
  const unavailable = error instanceof FinderRuntimeDatabaseUnavailableError;

  return NextResponse.json(
    {
      success: false,
      error: invalidToken
        ? 'Assessment token tidak valid.'
        : invalidInput
          ? 'Data assessment belum lengkap atau berisi pilihan yang tidak valid.'
          : unavailable
            ? 'Enterprise Solution Finder sedang dalam proses aktivasi. Silakan coba kembali beberapa saat lagi.'
            : 'Diagnosis Enterprise Solution Finder gagal diproses.',
    },
    {
      status: invalidToken ? 401 : invalidInput ? 400 : unavailable ? 503 : 500,
      headers: { ...NO_STORE, ...headers },
    },
  );
}

export async function POST(req: Request) {
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'enterprise-finder-diagnose',
    limit: 20,
    windowSeconds: 300,
  });
  const headers = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error:
          rateLimit.reason === 'limit-exceeded'
            ? 'Terlalu banyak permintaan diagnosis. Silakan coba beberapa menit lagi.'
            : 'Proteksi diagnostic engine belum siap.',
      },
      {
        status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { ...NO_STORE, ...headers },
      },
    );
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 250_000) {
    return NextResponse.json(
      { success: false, error: 'Payload assessment terlalu besar.' },
      { status: 413, headers: { ...NO_STORE, ...headers } },
    );
  }

  const body = await req.json().catch(() => null);
  const assessmentId =
    typeof body?.assessmentId === 'string' ? body.assessmentId.trim() : '';
  const token = req.headers.get('x-assessment-token') || '';
  const locale: FinderLocale = body?.locale === 'en' ? 'en' : 'id';

  if (!assessmentId || !token) {
    return NextResponse.json(
      { success: false, error: 'Assessment session belum tersedia.' },
      { status: 400, headers: { ...NO_STORE, ...headers } },
    );
  }

  try {
    const config = await getFinderConfigRuntime(locale);
    const allowed = {
      industries: valuesFor(config, 'industry'),
      scales: valuesFor(config, 'organization_scale'),
      regulated: valuesFor(config, 'regulated_status'),
      infrastructure: valuesFor(config, 'infrastructure'),
      dependencies: valuesFor(config, 'digital_dependency'),
      itTeams: valuesFor(config, 'it_team_size'),
      cyberTeams: valuesFor(config, 'cyber_team'),
      capabilities: valuesFor(config, 'capabilities'),
      pressures: valuesFor(config, 'pressures'),
      objectives: valuesFor(config, 'objective'),
      timelines: valuesFor(config, 'target_timeline'),
      deliveries: valuesFor(config, 'delivery_preference'),
      triggers: new Set(['data_breach_trigger', 'iso27001_trigger', 'soc_trigger']),
    };

    const input = normalizeInput(body?.input, locale, allowed);
    const engineData = await getFinderEngineDataRuntime(locale);

    let result = diagnoseEnterpriseFinder({
      input,
      config,
      engineData,
    });

    if (
      process.env.AI_ENTERPRISE_FINDER_ENABLED === 'true' &&
      engineData.aiPrompt
    ) {
      try {
        const ai = await generateAiWithFailover({
          systemPrompt: engineData.aiPrompt,
          contextText: JSON.stringify(
            {
              organization: {
                industry: input.organization.industry,
                organizationScale: input.organization.organizationScale,
                regulatedStatus: input.organization.regulatedStatus,
              },
              technology: {
                digitalDependency: input.technology.digitalDependency,
                infrastructure: input.technology.infrastructure,
              },
              deterministicDiagnosis: {
                enterprisePressureScore: result.enterprisePressureScore,
                topPriorities: result.topPriorities,
                capabilityGaps: result.capabilityGaps.slice(0, 8),
                primarySolutions: result.primarySolutions,
                roadmap: result.roadmap,
              },
              disclaimer: result.disclaimer,
            },
            null,
            2,
          ).slice(0, 20_000),
          messages: [
            {
              role: 'user',
              content:
                'Buat executive diagnostic narrative ringkas, consultative, evidence-bounded, dan jangan menambahkan fakta di luar payload.',
            },
          ],
        });

        if (ai) {
          result = {
            ...result,
            aiNarrative: {
              text: ai.text,
              provider: ai.provider,
            },
          };
        }
      } catch {
        // Deterministic diagnosis remains authoritative when optional AI is unavailable.
      }
    }

    const finalResult = { ...result, assessmentId };
    await completeFinderAssessmentRuntime(assessmentId, token, input, finalResult);

    return NextResponse.json(
      {
        success: true,
        result: finalResult,
        database: { connected: true, persisted: true },
      },
      { headers: { ...NO_STORE, ...headers } },
    );
  } catch (error) {
    return errorResponse(error, headers);
  }
}

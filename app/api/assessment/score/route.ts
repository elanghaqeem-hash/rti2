import { NextResponse } from 'next/server';
import {
  scoreAssessment,
  type AssessmentMode,
  type AssessmentProfile,
} from '@/lib/assessment/engine';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

function asPlainRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeNumericRecord(value: unknown) {
  const source = asPlainRecord(value);
  const output: Record<string, number> = {};

  for (const [key, raw] of Object.entries(source)) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) continue;
    output[key] = parsed;
  }

  return output;
}

function normalizeBooleanRecord(value: unknown) {
  const source = asPlainRecord(value);
  const output: Record<string, boolean> = {};

  for (const [key, raw] of Object.entries(source)) {
    if (raw === true || raw === false) output[key] = raw;
  }

  return output;
}

function normalizeProfile(value: unknown): AssessmentProfile {
  const source = asPlainRecord(value);

  const profile: AssessmentProfile = {
    companyName: typeof source.companyName === 'string' ? source.companyName.slice(0, 160) : '',
    industry: typeof source.industry === 'string' ? source.industry.slice(0, 120) : '',
    companySize: typeof source.companySize === 'string' ? source.companySize.slice(0, 80) : '',
  };

  if (source.regulated === 'yes' || source.regulated === 'no' || source.regulated === 'unsure') {
    profile.regulated = source.regulated;
  }

  if (
    source.cloudAdoption === 'none' ||
    source.cloudAdoption === 'limited' ||
    source.cloudAdoption === 'hybrid' ||
    source.cloudAdoption === 'cloud-first'
  ) {
    profile.cloudAdoption = source.cloudAdoption;
  }

  if (
    source.aiAdoption === 'none' ||
    source.aiAdoption === 'pilot' ||
    source.aiAdoption === 'production' ||
    source.aiAdoption === 'scaled'
  ) {
    profile.aiAdoption = source.aiAdoption;
  }

  return profile;
}

export async function POST(req: Request) {
  try {
    const rateLimit = await enforceRateLimit(req, {
      bucket: 'assessment-score',
      limit: 30,
      windowSeconds: 60,
    });

    if (!rateLimit.allowed) {
      const status = rateLimit.reason === 'limit-exceeded' ? 429 : 503;
      return NextResponse.json(
        {
          error:
            status === 429
              ? 'Terlalu banyak permintaan assessment. Silakan coba lagi sebentar.'
              : 'Proteksi API assessment belum siap.',
        },
        {
          status,
          headers: {
            ...NO_STORE_HEADERS,
            ...rateLimitHeaders(rateLimit),
          },
        },
      );
    }
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 250_000) {
      return NextResponse.json(
        { error: 'Assessment payload is too large.' },
        { status: 413, headers: NO_STORE_HEADERS },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid assessment payload.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const source = body as Record<string, unknown>;
    const mode: AssessmentMode =
      source.mode === 'comprehensive' ? 'comprehensive' : 'quick';

    const answers = normalizeNumericRecord(source.answers);

    if (Object.keys(answers).length === 0) {
      return NextResponse.json(
        { error: 'At least one valid assessment answer is required.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const result = scoreAssessment({
      mode,
      profile: normalizeProfile(source.profile),
      answers,
      targets: normalizeNumericRecord(source.targets),
      evidence: normalizeBooleanRecord(source.evidence),
    });

    return NextResponse.json(
      {
        success: true,
        scoring: {
          engine: 'RTI Technology & Cyber Maturity',
          version: '2026.09',
          calculatedServerSide: true,
        },
        result,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      'Assessment scoring error:',
      error instanceof Error ? error.message : String(error),
    );

    return NextResponse.json(
      { error: 'Assessment scoring could not be completed.' },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

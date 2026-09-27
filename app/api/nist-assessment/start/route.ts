import { NextResponse } from 'next/server';
import { createNistAssessment } from '@/lib/nist/repository';
import { serializeNistAssessmentCookie } from '@/lib/nist/access';
import {
  enforceRateLimit,
  rateLimitHeaders,
  verifyTurnstile,
} from '@/lib/security/request-protection';
import type {
  NistAssessmentType,
  NistOrganizationProfile,
  NistRespondentProfile,
} from '@/lib/nist/types';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const CONSENT_VERSION = 'NIST-QC-PRIVACY-2026.1';

function text(value: unknown, max: number, required = false) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (required && !normalized) throw new Error('required');
  return normalized.slice(0, max);
}

function email(value: unknown) {
  const normalized = text(value, 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('email');
  }
  return normalized;
}

function optionalInt(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function technologyContext(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const allowed = [
    'cloudUsage',
    'onPremiseInfrastructure',
    'hybridEnvironment',
    'publicFacingApplications',
    'mobileApplications',
    'criticalSystems',
    'customerData',
    'personalData',
    'paymentData',
    'thirdPartyProviders',
    'otIot',
    'remoteWorkforce',
  ];
  return Object.fromEntries(
    allowed.map((key) => [key, source[key] === true]),
  );
}

function normalize(body: unknown): {
  organization: NistOrganizationProfile;
  respondent: NistRespondentProfile;
  assessmentType: NistAssessmentType;
  organizationId?: string;
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('body');
  }
  const value = body as Record<string, unknown>;
  if (value.consent !== true) throw new Error('consent');

  const org = value.organization && typeof value.organization === 'object'
    ? value.organization as Record<string, unknown>
    : {};
  const respondent = value.respondent && typeof value.respondent === 'object'
    ? value.respondent as Record<string, unknown>
    : {};

  return {
    assessmentType: value.assessmentType === 'detailed' ? 'detailed' : 'quick',
    organizationId: text(value.organizationId, 120) || undefined,
    organization: {
      companyName: text(org.companyName, 180, true),
      industry: text(org.industry, 120, true),
      companySize: text(org.companySize, 80, true),
      employeeCount: optionalInt(org.employeeCount, 0, 10_000_000),
      itUserCount: optionalInt(org.itUserCount, 0, 10_000_000),
      country: text(org.country, 100),
      region: text(org.region, 120),
      locationCount: optionalInt(org.locationCount, 0, 100_000),
      website: text(org.website, 300),
      technologyContext: technologyContext(org.technologyContext),
    },
    respondent: {
      name: text(respondent.name, 140, true),
      title: text(respondent.title, 140),
      department: text(respondent.department, 140),
      email: email(respondent.email),
      phone: text(respondent.phone, 50),
    },
  };
}

export async function POST(req: Request) {
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'nist-start',
    limit: 10,
    windowSeconds: 300,
  });
  const rlHeaders = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error:
          rateLimit.reason === 'limit-exceeded'
            ? 'Too many assessment attempts. Please retry later.'
            : 'Public assessment protection is not configured.',
      },
      {
        status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { ...NO_STORE, ...rlHeaders },
      },
    );
  }

  if (Number(req.headers.get('content-length') || 0) > 80_000) {
    return NextResponse.json(
      { success: false, error: 'Assessment profile payload is too large.' },
      { status: 413, headers: { ...NO_STORE, ...rlHeaders } },
    );
  }

  const body = await req.json().catch(() => null);
  const turnstile = await verifyTurnstile(
    req,
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).turnstileToken
      : undefined,
  );

  if (!turnstile.success) {
    return NextResponse.json(
      { success: false, error: turnstile.error || 'Bot verification failed.' },
      {
        status: turnstile.configured ? 400 : 503,
        headers: { ...NO_STORE, ...rlHeaders },
      },
    );
  }

  let normalized: ReturnType<typeof normalize>;
  try {
    normalized = normalize(body);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'invalid';
    return NextResponse.json(
      {
        success: false,
        error:
          reason === 'consent'
            ? 'Consent is required before starting the assessment.'
            : reason === 'email'
              ? 'A valid corporate email address is required.'
              : 'Organization and respondent details are incomplete or invalid.',
      },
      { status: 400, headers: { ...NO_STORE, ...rlHeaders } },
    );
  }

  try {
    const created = createNistAssessment({
      ...normalized,
      consentVersion: CONSENT_VERSION,
    });

    return NextResponse.json(
      {
        success: true,
        assessment: created.assessment,
      },
      {
        status: 201,
        headers: {
          ...NO_STORE,
          ...rlHeaders,
          'Set-Cookie': serializeNistAssessmentCookie(
            created.assessment.id,
            created.accessToken,
          ),
        },
      },
    );
  } catch (error) {
    console.error(
      'NIST assessment start failed:',
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      {
        success: false,
        error: 'NIST assessment storage is unavailable. Ask an RTI admin to apply database migrations.',
      },
      { status: 503, headers: { ...NO_STORE, ...rlHeaders } },
    );
  }
}

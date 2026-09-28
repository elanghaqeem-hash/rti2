import { NextResponse } from 'next/server';
import { createPdpAssessment } from '@/lib/pdp/repository';
import { serializePdpAssessmentCookie } from '@/lib/pdp/access';
import {
  enforceRateLimit,
  rateLimitHeaders,
  verifyTurnstile,
} from '@/lib/security/request-protection';
import type {
  PdpAssessmentType,
  PdpOrganizationProfile,
  PdpRespondentProfile,
} from '@/lib/pdp/types';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const CONSENT_VERSION = 'PDP-READINESS-PRIVACY-2026.1';

function text(value: unknown, max: number, required = false) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (required && !normalized) throw new Error('required');
  return normalized.slice(0, max);
}

function email(value: unknown) {
  const normalized = text(value, 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('email');
  return normalized;
}

function optionalInt(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function boolean(value: unknown) {
  return value === true;
}

function normalize(body: unknown): {
  organization: PdpOrganizationProfile;
  respondent: PdpRespondentProfile;
  assessmentType: PdpAssessmentType;
  organizationId?: string;
  evidenceProcessingConsent: boolean;
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('body');
  const value = body as Record<string, unknown>;
  if (value.consent !== true) throw new Error('consent');

  const org =
    value.organization && typeof value.organization === 'object' && !Array.isArray(value.organization)
      ? (value.organization as Record<string, unknown>)
      : {};
  const respondent =
    value.respondent && typeof value.respondent === 'object' && !Array.isArray(value.respondent)
      ? (value.respondent as Record<string, unknown>)
      : {};

  return {
    assessmentType: value.assessmentType === 'detailed' ? 'detailed' : 'quick',
    organizationId: text(value.organizationId, 120) || undefined,
    evidenceProcessingConsent: value.evidenceProcessingConsent === true,
    organization: {
      companyName: text(org.companyName, 180, true),
      industry: text(org.industry, 120, true),
      companySize: text(org.companySize, 80, true),
      employeeCount: optionalInt(org.employeeCount, 0, 10_000_000),
      country: text(org.country, 100) || 'Indonesia',
      locationCount: optionalInt(org.locationCount, 0, 100_000),
      processesPersonalData: org.processesPersonalData !== false,
      processesSpecificData: boolean(org.processesSpecificData),
      publicServiceProcessing: boolean(org.publicServiceProcessing),
      largeScaleMonitoring: boolean(org.largeScaleMonitoring),
      crossBorderTransfer: boolean(org.crossBorderTransfer),
      usesProcessors: boolean(org.usesProcessors),
      automatedDecisioning: boolean(org.automatedDecisioning),
    },
    respondent: {
      name: text(respondent.name, 140, true),
      title: text(respondent.title, 140),
      email: email(respondent.email),
      phone: text(respondent.phone, 50),
    },
  };
}

export async function POST(req: Request) {
  const limit = await enforceRateLimit(req, {
    bucket: 'pdp-readiness-start',
    limit: 10,
    windowSeconds: 300,
  });
  const rlHeaders = rateLimitHeaders(limit);

  if (!limit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error:
          limit.reason === 'limit-exceeded'
            ? 'Terlalu banyak percobaan assessment. Silakan coba lagi nanti.'
            : 'Public assessment protection is not configured.',
      },
      {
        status: limit.reason === 'limit-exceeded' ? 429 : 503,
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
            ? 'Persetujuan pemrosesan data assessment wajib diberikan.'
            : reason === 'email'
              ? 'Alamat email profesional yang valid diperlukan.'
              : 'Profil organisasi atau responden belum lengkap.',
      },
      { status: 400, headers: { ...NO_STORE, ...rlHeaders } },
    );
  }

  try {
    const created = createPdpAssessment({
      ...normalized,
      consentVersion: CONSENT_VERSION,
    });

    return NextResponse.json(
      { success: true, assessment: created.assessment },
      {
        status: 201,
        headers: {
          ...NO_STORE,
          ...rlHeaders,
          'Set-Cookie': serializePdpAssessmentCookie(
            created.assessment?.id || '',
            created.accessToken,
          ),
        },
      },
    );
  } catch (error) {
    console.error(
      'PDP assessment start failed:',
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      {
        success: false,
        error:
          'Penyimpanan assessment UU PDP belum tersedia. Admin RTI perlu memastikan migration database telah diterapkan.',
      },
      { status: 503, headers: { ...NO_STORE, ...rlHeaders } },
    );
  }
}

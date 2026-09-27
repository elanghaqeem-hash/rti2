import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import {
  createPdpAssessment,
  deletePdpAssessment,
  listPdpEvidenceStorageNames,
  loadPdpAssessment,
  savePdpResponses,
} from '@/lib/pdp/repository';
import type { PdpMode, PdpProfile, PdpResponseInput } from '@/lib/pdp/types';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenFrom(req: Request) {
  const header = req.headers.get('authorization') || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

function arrayOfStrings(value: unknown, max = 20) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, max);
}

function asBoolean(value: unknown) {
  return value === true;
}

function asOptionalNumber(value: unknown, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.min(Math.trunc(parsed), max);
}

function normalizeProfile(input: unknown): PdpProfile {
  const source =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  return {
    companyName: String(source.companyName || '').trim().slice(0, 180),
    industry: String(source.industry || '').trim().slice(0, 120),
    organizationSize: String(source.organizationSize || '').trim().slice(0, 80),
    employeeCount: asOptionalNumber(source.employeeCount, 10000000),
    dataSubjectCount: asOptionalNumber(source.dataSubjectCount, 1000000000),
    customerTypes: arrayOfStrings(source.customerTypes, 6),
    operatingRegions: arrayOfStrings(source.operatingRegions, 20),
    crossBorderOperations: asBoolean(source.crossBorderOperations),
    internationalTransfer: asBoolean(source.internationalTransfer),
    publicServiceProcessing: asBoolean(source.publicServiceProcessing),
    largeScaleProcessing: asBoolean(source.largeScaleProcessing),
    regularSystematicLargeScaleMonitoring: asBoolean(source.regularSystematicLargeScaleMonitoring),
    largeScaleSpecificDataProcessing: asBoolean(source.largeScaleSpecificDataProcessing),
    largeScaleCriminalDataProcessing: asBoolean(source.largeScaleCriminalDataProcessing),
    actsAsController: source.actsAsController === false ? false : true,
    actsAsProcessor: asBoolean(source.actsAsProcessor),
    organizationalComplexityHigh: asBoolean(source.organizationalComplexityHigh),
    childrenData: asBoolean(source.childrenData),
    healthData: asBoolean(source.healthData),
    biometricData: asBoolean(source.biometricData),
    geneticData: asBoolean(source.geneticData),
    criminalData: asBoolean(source.criminalData),
    financialData: asBoolean(source.financialData),
    locationData: asBoolean(source.locationData),
    profiling: asBoolean(source.profiling),
    behavioralAnalytics: asBoolean(source.behavioralAnalytics),
    automatedDecisionMaking: asBoolean(source.automatedDecisionMaking),
    cctv: asBoolean(source.cctv),
    cookiesTracking: asBoolean(source.cookiesTracking),
    marketingDatabase: asBoolean(source.marketingDatabase),
    cloudSaas: asBoolean(source.cloudSaas),
    thirdPartyProcessor: asBoolean(source.thirdPartyProcessor),
    outsourcing: asBoolean(source.outsourcing),
    mobileApplication: asBoolean(source.mobileApplication),
    website: asBoolean(source.website),
    employeeData: asBoolean(source.employeeData),
    customerData: asBoolean(source.customerData),
    vendorData: asBoolean(source.vendorData),
  };
}

function normalizeResponses(value: unknown): PdpResponseInput[] {
  if (!Array.isArray(value)) return [];
  const allowedAnswers = new Set(['yes','partial','no','na','planned','unknown']);
  const allowedConfidence = new Set(['confirmed','partial','unverified']);
  const allowedEvidence = new Set(['verified','available','not_available','not_required']);

  return value.slice(0, 180).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const questionId = String(row.questionId || '').trim().slice(0, 120);
    if (!questionId) return [];

    const answer = String(row.answerValue || '');
    const confidence = String(row.confidence || '');
    const evidence = String(row.evidenceStatus || '');
    return [{
      questionId,
      answerValue: allowedAnswers.has(answer) ? (answer as PdpResponseInput['answerValue']) : undefined,
      numericValue: Number.isFinite(Number(row.numericValue)) ? Number(row.numericValue) : undefined,
      textValue: String(row.textValue || '').slice(0, 4000) || undefined,
      confidence: allowedConfidence.has(confidence) ? (confidence as PdpResponseInput['confidence']) : 'unverified',
      evidenceStatus: allowedEvidence.has(evidence) ? (evidence as PdpResponseInput['evidenceStatus']) : 'not_available',
    }];
  });
}

async function rateLimit(req: Request, bucket: string, limit: number) {
  const result = await enforceRateLimit(req, {
    bucket,
    limit,
    windowSeconds: 60,
  });
  return result;
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, 'pdp-create', 8);
  if (!limited.allowed) {
    return NextResponse.json(
      { success: false, error: 'Assessment request limit exceeded or API protection is not configured.' },
      { status: limited.reason === 'limit-exceeded' ? 429 : 503, headers: rateLimitHeaders(limited) },
    );
  }

  const body = await req.json().catch(() => null);
  const mode: PdpMode = body?.mode === 'comprehensive' ? 'comprehensive' : 'quick';
  const profile = normalizeProfile(body?.profile);

  if (!profile.industry || !profile.organizationSize) {
    return NextResponse.json(
      { success: false, error: 'Industry and organization size are required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }

  try {
    const result = createPdpAssessment(mode, profile);
    return NextResponse.json(
      {
        success: true,
        ...result,
        privacyNotice:
          'Assessment stores only information needed to produce the readiness result. Do not submit personal-data records, credentials, customer databases, or unnecessary confidential information.',
      },
      { status: 201, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to create assessment.' },
      { status: 503, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const assessmentId = String(url.searchParams.get('id') || '').slice(0, 80);
  const token = tokenFrom(req);
  if (!assessmentId || !token) {
    return NextResponse.json(
      { success: false, error: 'Assessment id and resume token are required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const limited = await rateLimit(req, 'pdp-load', 30);
  if (!limited.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many assessment requests.' },
      { status: limited.reason === 'limit-exceeded' ? 429 : 503, headers: rateLimitHeaders(limited) },
    );
  }

  try {
    const assessment = loadPdpAssessment(assessmentId, token);
    if (!assessment) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found or resume token is invalid.' },
        { status: 404, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
      );
    }
    return NextResponse.json(
      { success: true, assessment },
      { headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to load assessment.' },
      { status: 503, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }
}

export async function PUT(req: Request) {
  const limited = await rateLimit(req, 'pdp-save', 60);
  if (!limited.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many save requests.' },
      { status: limited.reason === 'limit-exceeded' ? 429 : 503, headers: rateLimitHeaders(limited) },
    );
  }

  const body = await req.json().catch(() => null);
  const assessmentId = String(body?.assessmentId || '').slice(0, 80);
  const token = tokenFrom(req);
  const responses = normalizeResponses(body?.responses);
  if (!assessmentId || !token || responses.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Assessment id, resume token, and responses are required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }

  try {
    const saved = savePdpResponses(assessmentId, token, responses);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found or resume token is invalid.' },
        { status: 404, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
      );
    }
    return NextResponse.json(
      { success: true, saved: responses.length },
      { headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to save assessment.' },
      { status: 503, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }
}


export async function DELETE(req: Request) {
  const limited = await rateLimit(req, 'pdp-delete', 6);
  if (!limited.allowed) {
    return NextResponse.json(
      { success: false, error: 'Delete request is temporarily unavailable.' },
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
    const evidenceRows = listPdpEvidenceStorageNames(assessmentId, token);
    if (!evidenceRows) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found or resume token is invalid.' },
        { status: 404, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
      );
    }

    const deleted = deletePdpAssessment(assessmentId, token);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Assessment could not be deleted.' },
        { status: 409, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
      );
    }

    const configuredRoot = String(process.env.PDP_EVIDENCE_DIR || '').trim();
    const root = configuredRoot
      ? path.resolve(configuredRoot)
      : process.env.NODE_ENV === 'production'
        ? ''
        : path.join(process.cwd(), 'data', 'pdp-evidence');

    if (root && evidenceRows.length > 0) {
      fs.rmSync(path.join(root, assessmentId), { recursive: true, force: true });
    }

    return NextResponse.json(
      { success: true, deleted: true },
      { headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to delete assessment.' },
      { status: 503, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }
}

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { hasPdpAssessmentAccess } from '@/lib/pdp/access';
import {
  getPdpAssessmentProfileRuntime,
  recordPdpEvidenceRuntime,
} from '@/lib/pdp/runtime-repository';
import { putPrivateObject, deletePrivateObject } from '@/lib/server/object-storage';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

const ALLOWED = new Map<string, string>([
  ['application/pdf', '.pdf'],
  ['application/msword', '.doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
  ['application/vnd.ms-excel', '.xls'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'],
  ['application/vnd.ms-powerpoint', '.ppt'],
  ['application/vnd.openxmlformats-officedocument.presentationml.presentation', '.pptx'],
  ['text/plain', '.txt'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
]);

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!(await hasPdpAssessmentAccess(req, id))) {
    return NextResponse.json(
      { success: false, error: 'Assessment access denied.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const profile = await getPdpAssessmentProfileRuntime(id);
  if (Number(profile?.evidenceProcessingConsent || 0) !== 1) {
    return NextResponse.json(
      { success: false, error: 'Evidence-processing consent has not been granted.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (process.env.NODE_ENV === 'production' && process.env.RTI_FILE_UPLOADS_ENABLED !== 'true') {
    return NextResponse.json(
      { success: false, error: 'Evidence upload is disabled until secure production storage is enabled.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const limit = await enforceRateLimit(req, {
    bucket: 'pdp-readiness-evidence',
    limit: 40,
    windowSeconds: 3600,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Evidence upload is temporarily unavailable.' },
      {
        status: limit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) },
      },
    );
  }

  let storageKey = '';
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new Error('Evidence file is required.');

    const extension = ALLOWED.get(file.type);
    if (!extension) {
      return NextResponse.json(
        { success: false, error: 'Tipe file tidak diizinkan.' },
        { status: 415, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const configuredMax = Number(process.env.RTI_FILE_UPLOAD_MAX_BYTES || 10 * 1024 * 1024);
    const max = Number.isFinite(configuredMax) ? configuredMax : 10 * 1024 * 1024;
    if (file.size <= 0 || file.size > max) {
      return NextResponse.json(
        { success: false, error: 'Ukuran file evidence melebihi batas yang diperbolehkan.' },
        { status: 413, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    storageKey = 'pdp/' + id + '/' + randomUUID() + extension;
    await putPrivateObject({
      key: storageKey,
      buffer: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type,
    });

    try {
      const evidence = await recordPdpEvidenceRuntime({
        assessmentId: id,
        questionId: String(form.get('questionId') || '').trim() || undefined,
        originalName: safeName(file.name),
        storedName: storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        classification: String(form.get('classification') || 'Confidential').slice(0, 80),
      });

      return NextResponse.json(
        {
          success: true,
          evidence,
          message:
            'Evidence disimpan pada private RTI object storage. Status malware scan tetap pending sampai scanner produksi dikonfigurasi.',
        },
        {
          status: 201,
          headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) },
        },
      );
    } catch (error) {
      await deletePrivateObject(storageKey).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    if (storageKey) await deletePrivateObject(storageKey).catch(() => undefined);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Evidence upload failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

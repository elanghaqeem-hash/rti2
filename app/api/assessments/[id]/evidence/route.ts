import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import {
  evidenceUploadDirectory,
  recordEvidenceFile,
} from '@/lib/iso27001/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME = new Map<string, string>([
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

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'iso27001-evidence-upload',
    limit: 30,
    windowSeconds: 3600,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Evidence upload is temporarily unavailable.' },
      {
        status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(rateLimit) },
      },
    );
  }

  const { id } = await context.params;
  const token = req.headers.get('x-assessment-token')?.trim() || '';

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'A file is required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const extension = ALLOWED_MIME.get(file.type);
    if (!extension) {
      return NextResponse.json(
        { success: false, error: 'File type is not allowed.' },
        { status: 415, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File must be between 1 byte and 10 MB.' },
        { status: 413, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const directory = evidenceUploadDirectory();
    const storedName = `${crypto.randomUUID()}${extension}`;
    const fullPath = path.join(directory, storedName);
    const bytes = Buffer.from(await file.arrayBuffer());

    fs.writeFileSync(fullPath, bytes, { flag: 'wx', mode: 0o600 });

    try {
      const evidence = recordEvidenceFile(id, token, {
        targetRef: String(form.get('targetRef') || '').trim() || undefined,
        originalName: cleanFileName(file.name),
        storedName,
        mimeType: file.type,
        sizeBytes: file.size,
        classification: String(form.get('classification') || 'Confidential'),
        retentionUntil: String(form.get('retentionUntil') || '').trim() || undefined,
        uploaderLabel: String(form.get('uploaderLabel') || '').trim() || undefined,
      });

      return NextResponse.json(
        {
          success: true,
          evidence,
          message:
            'Evidence stored in private server storage. Malware scan status is pending until a scanner integration is configured.',
        },
        {
          status: 201,
          headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(rateLimit) },
        },
      );
    } catch (error) {
      fs.rmSync(fullPath, { force: true });
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Evidence upload failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

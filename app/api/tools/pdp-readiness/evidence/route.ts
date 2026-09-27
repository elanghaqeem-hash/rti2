import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { NextResponse } from 'next/server';
import {
  getPdpEvidenceRules,
  recordPdpEvidence,
  verifyPdpAssessmentAccess,
  logPdpEvent,
} from '@/lib/pdp/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenFrom(req: Request) {
  const header = req.headers.get('authorization') || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

function maxBytes() {
  const configured = Number(process.env.PDP_EVIDENCE_MAX_BYTES || 10 * 1024 * 1024);
  return Number.isFinite(configured)
    ? Math.min(Math.max(configured, 1024 * 1024), 25 * 1024 * 1024)
    : 10 * 1024 * 1024;
}

function storageRoot() {
  const configured = String(process.env.PDP_EVIDENCE_DIR || '').trim();
  if (configured) return path.resolve(configured);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('PDP_EVIDENCE_DIR must be configured in production.');
  }
  return path.join(process.cwd(), 'data', 'pdp-evidence');
}

function safeName(name: string) {
  return path
    .basename(name)
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 140);
}

function startsWith(buffer: Buffer, bytes: number[]) {
  if (buffer.length < bytes.length) return false;
  return bytes.every((value, index) => buffer[index] === value);
}

function validateMagic(buffer: Buffer, extension: string) {
  if (extension === '.pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (extension === '.png') return startsWith(buffer, [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  if (extension === '.jpg' || extension === '.jpeg') return startsWith(buffer, [0xff,0xd8,0xff]);
  if (['.docx','.xlsx','.pptx'].includes(extension)) return startsWith(buffer, [0x50,0x4b,0x03,0x04]);
  if (['.doc','.xls','.ppt'].includes(extension)) return startsWith(buffer, [0xd0,0xcf,0x11,0xe0]);
  if (extension === '.txt') {
    const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
    return !sample.includes(0);
  }
  return false;
}

function scanFile(filePath: string) {
  const command = String(process.env.PDP_CLAMSCAN_COMMAND || '').trim();
  const requireScan =
    process.env.NODE_ENV === 'production' &&
    String(process.env.PDP_REQUIRE_MALWARE_SCAN || 'true').toLowerCase() !== 'false';

  if (!command) {
    if (requireScan) {
      return { status: 'scanner_unavailable', ok: false };
    }
    return { status: 'not_configured', ok: true };
  }

  const result = spawnSync(command, ['--no-summary', filePath], {
    encoding: 'utf8',
    timeout: 20000,
    windowsHide: true,
  });

  if (result.error) return { status: 'scan_error', ok: false };
  if (result.status === 0) return { status: 'clean', ok: true };
  if (result.status === 1) return { status: 'infected', ok: false };
  return { status: 'scan_error', ok: false };
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, {
    bucket: 'pdp-evidence',
    limit: 12,
    windowSeconds: 60,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { success: false, error: 'Evidence upload is temporarily unavailable.' },
      {
        status: limited.reason === 'limit-exceeded' ? 429 : 503,
        headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) },
      },
    );
  }

  const token = tokenFrom(req);
  const form = await req.formData().catch(() => null);
  const assessmentId = String(form?.get('assessmentId') || '').slice(0, 80);
  const questionId = String(form?.get('questionId') || '').slice(0, 120) || undefined;
  const file = form?.get('file');

  if (!assessmentId || !token || !(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: 'Assessment id, resume token, and file are required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }

  if (!verifyPdpAssessmentAccess(assessmentId, token)) {
    return NextResponse.json(
      { success: false, error: 'Assessment not found or resume token is invalid.' },
      { status: 404, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }

  const originalName = safeName(file.name || 'evidence');
  const extension = path.extname(originalName).toLowerCase();
  const evidenceRules = getPdpEvidenceRules();
  const matchingRule = evidenceRules.find(
    (rule) =>
      rule.extensions.includes(extension) &&
      rule.mimeTypes.includes(file.type),
  );
  const configuredMax = matchingRule?.maxBytes || maxBytes();
  const effectiveMax = Math.min(maxBytes(), configuredMax);

  if (file.size <= 0 || file.size > effectiveMax) {
    return NextResponse.json(
      { success: false, error: 'File is empty or exceeds the evidence size limit.' },
      { status: 413, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }

  if (!matchingRule) {
    return NextResponse.json(
      { success: false, error: 'Unsupported evidence file type.' },
      { status: 415, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagic(buffer, extension)) {
    return NextResponse.json(
      { success: false, error: 'File signature does not match the allowed document type.' },
      { status: 415, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }

  const hash = createHash('sha256').update(buffer).digest('hex');
  const root = storageRoot();
  const assessmentDir = path.join(root, assessmentId);
  fs.mkdirSync(assessmentDir, { recursive: true, mode: 0o700 });
  const storedName = randomUUID() + extension;
  const filePath = path.join(assessmentDir, storedName);

  fs.writeFileSync(filePath, buffer, { mode: 0o600, flag: 'wx' });

  const scan = scanFile(filePath);
  if (!scan.ok) {
    fs.rmSync(filePath, { force: true });
    const status = scan.status === 'infected' ? 422 : 503;
    return NextResponse.json(
      {
        success: false,
        error:
          scan.status === 'infected'
            ? 'Evidence file was rejected by malware scanning.'
            : 'Malware scanner is unavailable or returned an error.',
      },
      { status, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
    );
  }

  const evidenceId = recordPdpEvidence({
    assessmentId,
    questionId,
    originalName,
    storedName,
    mimeType: file.type,
    sizeBytes: file.size,
    sha256: hash,
    scanStatus: scan.status,
  });
  logPdpEvent(assessmentId, 'evidence_uploaded', {
    evidenceId,
    questionId,
    mimeType: file.type,
    sizeBytes: file.size,
    sha256: hash,
    scanStatus: scan.status,
  });

  return NextResponse.json(
    {
      success: true,
      evidence: {
        id: evidenceId,
        fileName: originalName,
        mimeType: file.type,
        sizeBytes: file.size,
        sha256: hash,
        scanStatus: scan.status,
      },
      warning:
        'Do not upload unnecessary personal or confidential information. Redact personal data before upload.',
    },
    { status: 201, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) } },
  );
}

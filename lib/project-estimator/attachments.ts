import { createHash, randomUUID } from 'node:crypto';
import { getRuntimeDatabase } from '@/lib/server/runtime-database';

const ALLOWED = new Map<string, string[]>([
  ['application/pdf', ['.pdf']],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['.docx']],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ['.xlsx']],
  ['image/png', ['.png']],
  ['image/jpeg', ['.jpg', '.jpeg']],
]);

function fileMagicMatches(buffer: Buffer, mime: string) {
  if (mime === 'application/pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (mime === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime.includes('officedocument')) return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  return false;
}

async function malwareScan(buffer: Buffer, fileName: string, mimeType: string) {
  const url = String(process.env.RTI_MALWARE_SCAN_URL || '').trim();
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      return { clean: false, reason: 'Malware scanner is not configured.' };
    }
    return { clean: true, reason: 'Development mode scanner bypass.' };
  }

  const token = String(process.env.RTI_MALWARE_SCAN_TOKEN || '').trim();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'X-File-Name': encodeURIComponent(fileName),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: new Uint8Array(buffer),
    cache: 'no-store',
  });
  if (!response.ok) return { clean: false, reason: `Scanner HTTP ${response.status}` };
  const payload = await response.json().catch(() => null) as any;
  const clean = payload?.clean === true || String(payload?.status || '').toLowerCase() === 'clean';
  return { clean, reason: clean ? 'clean' : 'Scanner rejected file.' };
}

async function resolveUploadDirectory() {
  const path = await import('node:path');
  const configured = String(process.env.RTI_UPLOAD_DIR || '').trim();
  if (!configured) throw new Error('RFQ file storage is not configured.');
  const resolved = path.resolve(configured);
  const publicRoot = path.resolve(process.cwd(), 'public');
  if (resolved === publicRoot || resolved.startsWith(publicRoot + path.sep)) {
    throw new Error('RFQ upload directory must be outside the public web root.');
  }
  return { directory: resolved, path };
}

export async function storeRfqAttachment(params: {
  rfqId: string;
  file: File;
  actor?: string;
}) {
  const db = await getRuntimeDatabase();
  if (db.kind !== 'node-sqlite') {
    throw new Error(
      'RFQ supporting-document upload requires configured object storage on Cloudflare. Upload is disabled until that storage is enabled.',
    );
  }
  if (process.env.NODE_ENV === 'production' && process.env.RTI_FILE_UPLOADS_ENABLED !== 'true') {
    throw new Error('RFQ file uploads are disabled in production.');
  }

  const maxBytes = Math.max(
    1024,
    Number(process.env.RTI_FILE_UPLOAD_MAX_BYTES || 10 * 1024 * 1024),
  );
  if (!Number.isFinite(params.file.size) || params.file.size <= 0 || params.file.size > maxBytes) {
    throw new Error(`File must be between 1 byte and ${Math.floor(maxBytes / 1024 / 1024)} MB.`);
  }

  const mimeType = String(params.file.type || '').toLowerCase();
  const extension = path.extname(params.file.name || '').toLowerCase();
  const allowedExtensions = ALLOWED.get(mimeType);
  if (!allowedExtensions?.includes(extension)) throw new Error('File type is not allowed.');

  const buffer = Buffer.from(await params.file.arrayBuffer());
  if (!fileMagicMatches(buffer, mimeType)) throw new Error('File content does not match the declared file type.');

  const scan = await malwareScan(buffer, params.file.name, mimeType);
  if (!scan.clean) throw new Error(scan.reason || 'File did not pass malware scanning.');

  const { directory, path } = await resolveUploadDirectory();
  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir(directory, { recursive: true });
  const attachmentId = randomUUID();
  const storageKey = `${attachmentId}${extension}`;
  const storagePath = path.join(directory, storageKey);
  await writeFile(storagePath, buffer, { flag: 'wx', mode: 0o600 });

  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO rfq_attachments
      (id, rfq_id, file_name, storage_key, mime_type, file_size, sha256, scan_status, uploaded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'clean', ?, ?)`,
    [
      attachmentId,
      params.rfqId,
      params.file.name.slice(0, 240),
      storageKey,
      mimeType,
      buffer.length,
      sha256,
      params.actor || 'customer',
      now,
    ],
  );

  return {
    id: attachmentId,
    fileName: params.file.name.slice(0, 240),
    mimeType,
    fileSize: buffer.length,
    sha256,
    scanStatus: 'clean',
    createdAt: now,
  };
}

export async function listRfqAttachments(rfqId: string) {
  const db = await getRuntimeDatabase();
  const rows = await db.queryAll<any>(
    `SELECT id, file_name, mime_type, file_size, sha256, scan_status, created_at
     FROM rfq_attachments WHERE rfq_id=? ORDER BY created_at DESC`,
    [rfqId],
  );
  return rows.map((row) => ({
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    sha256: row.sha256,
    scanStatus: row.scan_status,
    createdAt: row.created_at,
  }));
}

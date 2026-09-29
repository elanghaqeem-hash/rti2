import { createHash, randomUUID } from 'node:crypto';
import { getRuntimeDatabase } from '@/lib/server/runtime-database';
import { getPrivateObject, putPrivateObject } from '@/lib/server/object-storage';

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

export async function storeRfqAttachment(params: {
  rfqId: string;
  file: File;
  actor?: string;
}) {
  const db = await getRuntimeDatabase();
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
  const extension = (String(params.file.name || '').match(/\.[A-Za-z0-9]+$/)?.[0] || '').toLowerCase();
  const allowedExtensions = ALLOWED.get(mimeType);
  if (!allowedExtensions?.includes(extension)) throw new Error('File type is not allowed.');

  const buffer = Buffer.from(await params.file.arrayBuffer());
  if (!fileMagicMatches(buffer, mimeType)) throw new Error('File content does not match the declared file type.');

  const scan = await malwareScan(buffer, params.file.name, mimeType);
  if (!scan.clean) throw new Error(scan.reason || 'File did not pass malware scanning.');

  const attachmentId = randomUUID();
  const storageKey = `rfq/${params.rfqId}/${attachmentId}${extension}`;
  await putPrivateObject({
    key: storageKey,
    buffer: new Uint8Array(buffer),
    contentType: mimeType,
  });

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

export async function readRfqAttachment(rfqId: string, attachmentId: string) {
  const db = await getRuntimeDatabase();

  const row = await db.queryOne<{
    file_name: string;
    storage_key: string;
    mime_type: string;
    sha256: string;
    scan_status: string;
  }>(
    `SELECT file_name, storage_key, mime_type, sha256, scan_status
     FROM rfq_attachments WHERE id=? AND rfq_id=?`,
    [attachmentId, rfqId],
  );
  if (!row) throw new Error('RFQ attachment not found.');
  if (row.scan_status !== 'clean') throw new Error('RFQ attachment is not cleared for download.');

  if (!row.storage_key || row.storage_key.includes('..')) throw new Error('Invalid RFQ attachment storage key.');
  const bytes = await getPrivateObject(row.storage_key);
  if (!bytes) throw new Error('RFQ attachment object is missing.');
  const buffer = Buffer.from(bytes);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  if (sha256 !== row.sha256) throw new Error('RFQ attachment integrity verification failed.');

  return {
    fileName: row.file_name,
    mimeType: row.mime_type,
    sha256,
    buffer,
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

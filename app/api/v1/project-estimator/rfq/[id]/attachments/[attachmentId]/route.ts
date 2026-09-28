import { verifyRfqAccess } from '@/lib/project-estimator/repository';
import { readRfqAttachment } from '@/lib/project-estimator/attachments';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const limit = await enforceRateLimit(req, { bucket: 'project-rfq-attachment-download', limit: 30, windowSeconds: 300 });
  const headers = { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) };
  if (!limit.allowed) {
    return Response.json({ success: false, error: 'Attachment download is temporarily unavailable or rate limited.' }, { status: limit.reason === 'limit-exceeded' ? 429 : 503, headers });
  }

  const { id, attachmentId } = await context.params;
  const token = req.headers.get('x-rti-resume-token')?.trim() || '';
  if (!(await verifyRfqAccess(id, token))) {
    return Response.json({ success: false, error: 'RFQ access denied.' }, { status: 403, headers });
  }

  try {
    const file = await readRfqAttachment(id, attachmentId);
    const safeName = file.fileName.replace(/[\r\n"\\]/g, '_').slice(0, 240) || 'attachment';
    return new Response(new Uint8Array(file.buffer), {
      headers: {
        ...headers,
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'X-Content-Type-Options': 'nosniff',
        'X-RTI-Content-SHA256': file.sha256,
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : 'Attachment download failed.' }, { status: 422, headers });
  }
}

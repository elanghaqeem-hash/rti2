import { NextResponse } from 'next/server';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';
import { verifyRfqAccess } from '@/lib/project-estimator/repository';
import { listRfqAttachments, storeRfqAttachment } from '@/lib/project-estimator/attachments';

export const runtime = 'nodejs';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const limit = await enforceRateLimit(req, { bucket: 'project-rfq-attachments-list', limit: 40, windowSeconds: 300 });
  const headers = { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) };
  if (!limit.allowed) return NextResponse.json({ success: false, error: 'Attachment access is temporarily unavailable or rate limited.' }, { status: limit.reason === 'limit-exceeded' ? 429 : 503, headers });

  const { id } = await context.params;
  const resumeToken = req.headers.get('x-rti-resume-token')?.trim() || '';
  if (!verifyRfqAccess(id, resumeToken)) return NextResponse.json({ success: false, error: 'RFQ access denied.' }, { status: 403, headers });
  return NextResponse.json({ success: true, attachments: listRfqAttachments(id) }, { headers });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const limit = await enforceRateLimit(req, { bucket: 'project-rfq-attachment-upload', limit: 8, windowSeconds: 600 });
  const headers = { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) };
  if (!limit.allowed) return NextResponse.json({ success: false, error: 'Attachment upload is temporarily unavailable or rate limited.' }, { status: limit.reason === 'limit-exceeded' ? 429 : 503, headers });

  const { id } = await context.params;
  const form = await req.formData().catch(() => null);
  const resumeToken = String(form?.get('resumeToken') || '');
  if (!verifyRfqAccess(id, resumeToken)) return NextResponse.json({ success: false, error: 'RFQ access denied.' }, { status: 403, headers });

  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ success: false, error: 'A valid file is required.' }, { status: 400, headers });

  try {
    const attachment = await storeRfqAttachment({ rfqId: id, file });
    return NextResponse.json({ success: true, attachment, attachments: listRfqAttachments(id) }, { status: 201, headers });
  } catch (error) {
    console.warn('RFQ attachment rejected:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Attachment was rejected.' }, { status: 422, headers });
  }
}

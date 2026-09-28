import { verifyRfqAccess } from '@/lib/project-estimator/repository';
import { sendCustomerRfqCopy } from '@/lib/project-estimator/notifications';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const limit = await enforceRateLimit(req, { bucket: 'project-rfq-email-copy', limit: 3, windowSeconds: 900 });
  const headers = { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) };
  if (!limit.allowed) {
    return Response.json({ success: false, error: 'RFQ email is temporarily unavailable or rate limited.' }, { status: limit.reason === 'limit-exceeded' ? 429 : 503, headers });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => null) as { resumeToken?: string } | null;
  if (!(await verifyRfqAccess(id, String(body?.resumeToken || '')))) {
    return Response.json({ success: false, error: 'RFQ access denied.' }, { status: 403, headers });
  }

  try {
    const result = await sendCustomerRfqCopy(id);
    if (!result.sent) {
      return Response.json({ success: false, error: 'RFQ email delivery is not configured by RTI Admin.' }, { status: 503, headers });
    }
    return Response.json({ success: true, rfqNumber: result.rfqNumber, message: 'RFQ copy sent to the registered project contact email.' }, { headers });
  } catch (error) {
    console.warn('RFQ email copy failed:', error instanceof Error ? error.message : String(error));
    return Response.json({ success: false, error: 'RFQ email could not be sent.' }, { status: 422, headers });
  }
}

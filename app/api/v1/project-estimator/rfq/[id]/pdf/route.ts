import { getRfq, verifyRfqAccess } from '@/lib/project-estimator/repository';
import { buildRfqPdf } from '@/lib/project-estimator/pdf';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const limit = await enforceRateLimit(req, { bucket: 'project-rfq-pdf', limit: 20, windowSeconds: 300 });
  const headers = { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) };
  if (!limit.allowed) {
    return Response.json({ success: false, error: 'RFQ PDF is temporarily unavailable or rate limited.' }, { status: limit.reason === 'limit-exceeded' ? 429 : 503, headers });
  }

  const { id } = await context.params;
  const token = req.headers.get('x-rti-resume-token')?.trim() || '';
  if (!(await verifyRfqAccess(id, token))) {
    return Response.json({ success: false, error: 'RFQ access denied.' }, { status: 403, headers });
  }

  try {
    const rfq = await getRfq(id);
    const pdf = buildRfqPdf(rfq);
    const fileName = `${rfq.rfqNumber.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...headers,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : 'RFQ PDF generation failed.' }, { status: 422, headers });
  }
}

import { NextResponse } from 'next/server';
import { adminSessionFromRequest } from '@/lib/admin/auth';
import { buildQuotationPdf } from '@/lib/project-estimator/quotation-pdf';
import {
  getQuotationPdfData,
  verifyPortalQuotationAccess,
} from '@/lib/project-estimator/studio';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = adminSessionFromRequest(req);
  const resumeToken = String(req.headers.get('x-rti-resume-token') || '').trim();

  if (!admin) {
    if (!resumeToken || !(await verifyPortalQuotationAccess(id, resumeToken))) {
      return NextResponse.json(
        { success: false, error: 'Quotation access denied.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }

  try {
    const data = await getQuotationPdfData(id);
    const pdf = buildQuotationPdf(data);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${data.docNumber.replace(/\//g, '-')}.pdf"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Quotation PDF unavailable.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

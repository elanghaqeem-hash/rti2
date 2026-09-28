import { NextResponse } from 'next/server';
import { adminSessionFromRequest } from '@/lib/admin/auth';
import {
  createStudioQuotation,
  decideStudioQuotation,
  getStudioSession,
  markStudioQuotationSent,
  saveEstimatorActual,
  saveStudioBoq,
} from '@/lib/project-estimator/studio';

export const runtime = 'nodejs';

function noStore(status = 200) {
  return { status, headers: { 'Cache-Control': 'no-store' } };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = adminSessionFromRequest(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Admin authentication required.' }, noStore(401));
  const { sessionId } = await params;
  try {
    return NextResponse.json({ success: true, studio: await getStudioSession(sessionId) }, noStore());
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Studio session unavailable.' },
      noStore(404),
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = adminSessionFromRequest(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Admin authentication required.' }, noStore(401));
  const { sessionId } = await params;
  const body = await req.json().catch(() => null) as any;
  const action = String(body?.action || '');

  try {
    if (action === 'boq') {
      await saveStudioBoq({
        estimateId: String(body.estimateId || ''),
        aResourceCost: Number(body.boq?.aResourceCost || 0),
        bCommissionReferral: Number(body.boq?.bCommissionReferral || 0),
        cDocumentMaterial: Number(body.boq?.cDocumentMaterial || 0),
        dThirdParty: Number(body.boq?.dThirdParty || 0),
        eTravelAccommodation: Number(body.boq?.eTravelAccommodation || 0),
        note: String(body.boq?.note || ''),
        actor: auth.sub,
      });
    } else if (action === 'quotation') {
      await createStudioQuotation({
        sessionId,
        estimateId: String(body.estimateId || ''),
        segmentCode: String(body.segmentCode || 'STD'),
        priceOption: ['floor','standard','premium','custom'].includes(String(body.priceOption))
          ? body.priceOption
          : 'standard',
        customPrice: body.customPrice == null ? undefined : Number(body.customPrice),
        discountPct: Number(body.discountPct || 0),
        segmentOverrideReason: typeof body.segmentOverrideReason === 'string' ? body.segmentOverrideReason : undefined,
        actor: auth.sub,
      });
    } else if (action === 'approve_quotation') {
      await decideStudioQuotation({
        quotationId: String(body.quotationId || ''),
        decision: body.decision === 'rejected' ? 'rejected' : 'approved',
        note: typeof body.note === 'string' ? body.note : undefined,
        actor: auth.sub,
      });
    } else if (action === 'send_quotation') {
      await markStudioQuotationSent({
        quotationId: String(body.quotationId || ''),
        actor: auth.sub,
      });
    } else if (action === 'actual') {
      await saveEstimatorActual({
        estimateId: String(body.estimateId || ''),
        actualMd: body.actual?.actualMd == null ? null : Number(body.actual.actualMd),
        actualCost: body.actual?.actualCost == null ? null : Number(body.actual.actualCost),
        completedAt: body.actual?.completedAt ? String(body.actual.completedAt) : null,
        note: typeof body.actual?.note === 'string' ? body.actual.note : undefined,
        actor: auth.sub,
      });
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported Studio action.' }, noStore(400));
    }

    return NextResponse.json({ success: true, studio: await getStudioSession(sessionId) }, noStore());
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Studio update failed.' },
      noStore(422),
    );
  }
}

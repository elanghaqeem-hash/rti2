import { NextResponse } from 'next/server';
import { adminSessionFromRequest } from '@/lib/admin/auth';
import {
  getEstimatorAdminDashboard,
  updateEstimatorQuestion,
  updateEstimatorService,
  updateOpportunityStage,
  updatePricingParameter,
} from '@/lib/project-estimator/admin';

export const runtime = 'nodejs';

function session(req: Request) {
  return adminSessionFromRequest(req);
}

function noStore(status = 200) {
  return { status, headers: { 'Cache-Control': 'no-store' } };
}

export async function GET(req: Request) {
  const auth = session(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Admin authentication required.' }, noStore(401));
  try {
    return NextResponse.json({ success: true, dashboard: getEstimatorAdminDashboard() }, noStore());
  } catch (error) {
    console.error('Estimator admin dashboard failed:', error);
    return NextResponse.json(
      { success: false, error: 'Estimator database is unavailable or the latest migration has not been applied.' },
      noStore(503),
    );
  }
}

export async function PATCH(req: Request) {
  const auth = session(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Admin authentication required.' }, noStore(401));
  const body = await req.json().catch(() => null) as any;
  const action = typeof body?.action === 'string' ? body.action : '';

  try {
    if (action === 'opportunity_stage') {
      updateOpportunityStage({
        rfqId: String(body.rfqId || ''),
        stage: String(body.stage || ''),
        actor: auth.sub,
        note: typeof body.note === 'string' ? body.note : undefined,
      });
    } else if (action === 'service') {
      updateEstimatorService({
        id: String(body.service?.id || ''),
        name: String(body.service?.name || ''),
        description: String(body.service?.description || ''),
        baseEffortDays: Number(body.service?.baseEffortDays),
        basePriceMin: Number(body.service?.basePriceMin),
        basePriceMax: Number(body.service?.basePriceMax),
        durationMinWeeks: Number(body.service?.durationMinWeeks),
        durationMaxWeeks: Number(body.service?.durationMaxWeeks),
        active: body.service?.active !== false,
        actor: auth.sub,
      });
    } else if (action === 'pricing') {
      updatePricingParameter({
        key: String(body.key || ''),
        value: Number(body.value),
        actor: auth.sub,
      });
    } else if (action === 'question') {
      updateEstimatorQuestion({
        id: String(body.question?.id || ''),
        label: String(body.question?.label || ''),
        helpText: typeof body.question?.helpText === 'string' ? body.question.helpText : undefined,
        required: body.question?.required === true,
        weight: Number(body.question?.weight ?? 1),
        quickMode: body.question?.quickMode === true,
        detailedMode: body.question?.detailedMode !== false,
        active: body.question?.active !== false,
        actor: auth.sub,
      });
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported admin action.' }, noStore(400));
    }

    return NextResponse.json({ success: true, dashboard: getEstimatorAdminDashboard() }, noStore());
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Estimator configuration update failed.' },
      noStore(422),
    );
  }
}

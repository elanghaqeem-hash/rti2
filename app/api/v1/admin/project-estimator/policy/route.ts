import { NextResponse } from 'next/server';
import { adminSessionFromRequest } from '@/lib/admin/auth';
import {
  activateEstimatorPolicy,
  createEstimatorPolicyDraft,
  getEstimatorPolicies,
  simulateEstimatorPolicy,
} from '@/lib/project-estimator/policy';

export const runtime = 'nodejs';

function noStore(status = 200) {
  return { status, headers: { 'Cache-Control': 'no-store' } };
}

export async function GET(req: Request) {
  const auth = adminSessionFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Admin authentication required.' },
      noStore(401),
    );
  }
  return NextResponse.json(
    { success: true, ...(await getEstimatorPolicies()) },
    noStore(),
  );
}

export async function POST(req: Request) {
  const auth = adminSessionFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Admin authentication required.' },
      noStore(401),
    );
  }
  const body = await req.json().catch(() => null) as any;
  try {
    const simulation = await simulateEstimatorPolicy({
      floorMargin: Number(body?.floorMargin ?? 0.20),
      premiumFactor: Number(body?.premiumFactor ?? 1.25),
      rushFactor: Number(body?.rushFactor ?? 1.25),
      marketAdjustment: Number(body?.marketAdjustment ?? 1),
      minMarginAlert: Number(body?.minMarginAlert ?? 0.25),
      segmentCode: String(body?.segmentCode || 'STD'),
    });
    return NextResponse.json({ success: true, simulation }, noStore());
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Policy simulation failed.' },
      noStore(422),
    );
  }
}

export async function PATCH(req: Request) {
  const auth = adminSessionFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Admin authentication required.' },
      noStore(401),
    );
  }
  const body = await req.json().catch(() => null) as any;
  const action = String(body?.action || '');

  try {
    if (action === 'create_draft') {
      await createEstimatorPolicyDraft({
        version: String(body?.policy?.version || ''),
        floorMargin: Number(body?.policy?.floorMargin ?? 0.20),
        premiumFactor: Number(body?.policy?.premiumFactor ?? 1.25),
        rushFactor: Number(body?.policy?.rushFactor ?? 1.25),
        marketAdjustment: Number(body?.policy?.marketAdjustment ?? 1),
        minMarginAlert: Number(body?.policy?.minMarginAlert ?? 0.25),
        notes: String(body?.policy?.notes || ''),
        actor: auth.sub,
      });
    } else if (action === 'activate') {
      await activateEstimatorPolicy({
        policyId: String(body?.policyId || ''),
        confirmation: String(body?.confirmation || ''),
        actor: auth.sub,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported policy action.' },
        noStore(400),
      );
    }
    return NextResponse.json(
      { success: true, ...(await getEstimatorPolicies()) },
      noStore(),
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Policy update failed.' },
      noStore(422),
    );
  }
}

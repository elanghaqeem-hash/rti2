import { NextResponse } from 'next/server';
import { adminSessionFromRequest, adminSessionHasPermission } from '@/lib/admin/auth';
import { enforceSameOriginMutation } from '@/lib/security/request-protection';
import {
  cloneEstimatorPolicy,
  confirmEstimatorApprovalMatrix,
  getEstimatorPolicyGovernance,
  publishEstimatorPolicy,
  runEstimatorPolicyPublishChecks,
  saveEstimatorPolicyDraft,
  simulateEstimatorPolicy,
  updateEstimatorSegment,
  updateGoLiveDecision,
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
  if (!adminSessionHasPermission(auth, 'policy:read')) {
    return NextResponse.json(
      { success: false, error: auth.mustChangePassword ? 'Password change required.' : 'Insufficient permission.' },
      noStore(403),
    );
  }

  try {
    return NextResponse.json(
      { success: true, governance: await getEstimatorPolicyGovernance() },
      noStore(),
    );
  } catch (error) {
    console.error('Estimator policy governance load failed:', error);
    return NextResponse.json(
      { success: false, error: 'Policy governance data is unavailable. Apply the latest migration first.' },
      noStore(503),
    );
  }
}

export async function POST(req: Request) {
  const auth = adminSessionFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Admin authentication required.' },
      noStore(401),
    );
  }
  const origin = enforceSameOriginMutation(req);
  if (!origin.allowed) {
    return NextResponse.json(
      { success: false, error: origin.reason || 'Cross-origin request denied.' },
      noStore(403),
    );
  }

  const body = (await req.json().catch(() => null)) as any;
  const action = String(body?.action || '');
  const requiredPermission = action === 'publish' ? 'policy:publish' : 'policy:write';
  if (!adminSessionHasPermission(auth, requiredPermission)) {
    return NextResponse.json(
      { success: false, error: auth.mustChangePassword ? 'Password change required.' : 'Insufficient permission.' },
      noStore(403),
    );
  }

  try {
    let result: unknown = null;

    if (action === 'save_policy') {
      result = {
        id: await saveEstimatorPolicyDraft({
          id: body.policy?.id ? String(body.policy.id) : undefined,
          version: String(body.policy?.version || ''),
          floorMargin: Number(body.policy?.floorMargin),
          premiumFactor: Number(body.policy?.premiumFactor),
          rushFactor: Number(body.policy?.rushFactor),
          marketAdjustment: Number(body.policy?.marketAdjustment),
          minMarginAlert: Number(body.policy?.minMarginAlert),
          notes: String(body.policy?.notes || ''),
          actor: auth.sub,
        }),
      };
    } else if (action === 'clone_policy') {
      result = {
        id: await cloneEstimatorPolicy({
          sourceId: String(body.sourceId || ''),
          version: String(body.version || ''),
          actor: auth.sub,
        }),
      };
    } else if (action === 'simulate') {
      result = await simulateEstimatorPolicy({
        policyVersionId: body.policyVersionId ? String(body.policyVersionId) : undefined,
        candidate: {
          id: body.candidate?.id ? String(body.candidate.id) : undefined,
          version: String(body.candidate?.version || ''),
          floorMargin: Number(body.candidate?.floorMargin),
          premiumFactor: Number(body.candidate?.premiumFactor),
          rushFactor: Number(body.candidate?.rushFactor),
          marketAdjustment: Number(body.candidate?.marketAdjustment),
          minMarginAlert: Number(body.candidate?.minMarginAlert),
          notes: String(body.candidate?.notes || ''),
        },
        actor: auth.sub,
      });
    } else if (action === 'segment') {
      await updateEstimatorSegment({
        code: String(body.segment?.code || ''),
        multiplier: Number(body.segment?.multiplier),
        confirmed: body.segment?.confirmed === true,
        actor: auth.sub,
      });
      result = { updated: true };
    } else if (action === 'confirm_approval_matrix') {
      await confirmEstimatorApprovalMatrix({
        note: String(body.note || ''),
        actor: auth.sub,
      });
      result = { updated: true };
    } else if (action === 'decision') {
      await updateGoLiveDecision({
        code: String(body.decision?.code || ''),
        status: body.decision?.status === 'confirmed' ? 'confirmed' : 'pending',
        decision:
          typeof body.decision?.decision === 'object' && body.decision?.decision !== null
            ? body.decision.decision
            : String(body.decision?.decision || ''),
        actor: auth.sub,
      });
      result = { updated: true };
    } else if (action === 'checks') {
      result = await runEstimatorPolicyPublishChecks({
        policyVersionId: String(body.policyVersionId || ''),
        actor: auth.sub,
      });
    } else if (action === 'publish') {
      result = await publishEstimatorPolicy({
        policyVersionId: String(body.policyVersionId || ''),
        confirmation: String(body.confirmation || ''),
        actor: auth.sub,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported policy action.' },
        noStore(400),
      );
    }

    return NextResponse.json(
      {
        success: true,
        result,
        governance: await getEstimatorPolicyGovernance(),
      },
      noStore(),
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Policy action failed.',
      },
      noStore(422),
    );
  }
}

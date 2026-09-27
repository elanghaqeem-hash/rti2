import { NextResponse } from 'next/server';
import { adminSessionFromRequest } from '@/lib/admin/auth';
import {
  createEstimatorQuestion,
  createEstimatorService,
  getEstimatorAdminDashboard,
  updateEstimatorQuestion,
  updateEstimatorService,
  updateEstimatorSetting,
  updateOpportunityStage,
  updatePricingParameter,
  upsertEstimatorRule,
  upsertQuestionOption,
  upsertResourceRole,
  upsertServiceCategory,
  upsertServiceResource,
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
    } else if (action === 'category') {
      upsertServiceCategory({
        id: body.category?.id ? String(body.category.id) : undefined,
        slug: body.category?.slug ? String(body.category.slug) : undefined,
        name: String(body.category?.name || ''),
        description: typeof body.category?.description === 'string' ? body.category.description : undefined,
        sortOrder: Number(body.category?.sortOrder ?? 100),
        active: body.category?.active !== false,
        actor: auth.sub,
      });
    } else if (action === 'create_service') {
      createEstimatorService({
        categoryId: String(body.service?.categoryId || ''),
        slug: body.service?.slug ? String(body.service.slug) : undefined,
        name: String(body.service?.name || ''),
        description: typeof body.service?.description === 'string' ? body.service.description : undefined,
        baseEffortDays: Number(body.service?.baseEffortDays ?? 5),
        basePriceMin: Number(body.service?.basePriceMin ?? 0),
        basePriceMax: Number(body.service?.basePriceMax ?? 0),
        durationMinWeeks: Number(body.service?.durationMinWeeks ?? 1),
        durationMaxWeeks: Number(body.service?.durationMaxWeeks ?? 2),
        actor: auth.sub,
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
    } else if (action === 'setting') {
      updateEstimatorSetting({
        key: String(body.key || ''),
        value: String(body.value ?? ''),
        actor: auth.sub,
      });
    } else if (action === 'create_question') {
      createEstimatorQuestion({
        serviceId: body.question?.serviceId ? String(body.question.serviceId) : null,
        key: String(body.question?.key || ''),
        label: String(body.question?.label || ''),
        helpText: typeof body.question?.helpText === 'string' ? body.question.helpText : undefined,
        fieldType: String(body.question?.fieldType || 'text'),
        required: body.question?.required === true,
        dimension: body.question?.dimension ? String(body.question.dimension) : null,
        weight: Number(body.question?.weight ?? 1),
        sortOrder: Number(body.question?.sortOrder ?? 100),
        quickMode: body.question?.quickMode !== false,
        detailedMode: body.question?.detailedMode !== false,
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
    } else if (action === 'question_option') {
      upsertQuestionOption({
        id: body.option?.id ? String(body.option.id) : undefined,
        questionId: String(body.option?.questionId || ''),
        value: String(body.option?.value || ''),
        label: String(body.option?.label || ''),
        score: Number(body.option?.score ?? 3),
        effortMultiplier: Number(body.option?.effortMultiplier ?? 1),
        priceMultiplier: Number(body.option?.priceMultiplier ?? 1),
        sortOrder: Number(body.option?.sortOrder ?? 100),
        active: body.option?.active !== false,
        actor: auth.sub,
      });
    } else if (action === 'rule') {
      upsertEstimatorRule({
        id: body.rule?.id ? String(body.rule.id) : undefined,
        serviceId: body.rule?.serviceId ? String(body.rule.serviceId) : null,
        name: String(body.rule?.name || ''),
        conditionsJson: String(body.rule?.conditionsJson || '[]'),
        effectsJson: String(body.rule?.effectsJson || '{}'),
        sortOrder: Number(body.rule?.sortOrder ?? 100),
        active: body.rule?.active !== false,
        actor: auth.sub,
      });
    } else if (action === 'resource') {
      upsertResourceRole({
        id: body.resource?.id ? String(body.resource.id) : undefined,
        roleKey: String(body.resource?.roleKey || ''),
        name: String(body.resource?.name || ''),
        internalDayRate: body.resource?.internalDayRate == null ? null : Number(body.resource.internalDayRate),
        active: body.resource?.active !== false,
        actor: auth.sub,
      });
    } else if (action === 'service_resource') {
      upsertServiceResource({
        serviceId: String(body.serviceResource?.serviceId || ''),
        resourceRoleId: String(body.serviceResource?.resourceRoleId || ''),
        quantity: Number(body.serviceResource?.quantity ?? 1),
        effortShare: Number(body.serviceResource?.effortShare ?? 0),
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

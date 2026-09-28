import { NextResponse } from 'next/server';
import { clearPdpAssessmentCookie, hasPdpAssessmentAccess } from '@/lib/pdp/access';
import {
  deletePdpAssessmentRuntime,
  getPdpAnswersRuntime,
  getPdpAssessmentProfileRuntime,
  getPdpAssessmentRuntime,
  getPdpEvidenceRuntime,
} from '@/lib/pdp/runtime-repository';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!(await hasPdpAssessmentAccess(req, id))) {
    return NextResponse.json(
      { success: false, error: 'Assessment access denied.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const assessment = await getPdpAssessmentRuntime(id);
  if (!assessment) {
    return NextResponse.json(
      { success: false, error: 'Assessment not found.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const [profile, answers, evidence] = await Promise.all([
    getPdpAssessmentProfileRuntime(id),
    getPdpAnswersRuntime(id),
    getPdpEvidenceRuntime(id),
  ]);

  return NextResponse.json(
    { success: true, assessment, profile, answers, evidence },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!(await hasPdpAssessmentAccess(req, id))) {
    return NextResponse.json(
      { success: false, error: 'Assessment access denied.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const result = await deletePdpAssessmentRuntime(id);
    return NextResponse.json(
      { success: true, result },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Set-Cookie': clearPdpAssessmentCookie(),
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Assessment deletion failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

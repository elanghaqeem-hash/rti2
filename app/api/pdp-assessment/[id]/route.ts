import { NextResponse } from 'next/server';
import {
  clearPdpAssessmentCookie,
  hasPdpAssessmentAccess,
} from '@/lib/pdp/access';
import {
  deletePdpAssessment,
  getPdpAnswers,
  getPdpAssessment,
  getPdpAssessmentProfile,
  getPdpEvidence,
} from '@/lib/pdp/repository';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!hasPdpAssessmentAccess(req, id)) {
    return NextResponse.json(
      { success: false, error: 'Assessment access denied.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const assessment = getPdpAssessment(id);
  if (!assessment) {
    return NextResponse.json(
      { success: false, error: 'Assessment not found.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    {
      success: true,
      assessment,
      profile: getPdpAssessmentProfile(id),
      answers: getPdpAnswers(id),
      evidence: getPdpEvidence(id),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!hasPdpAssessmentAccess(req, id)) {
    return NextResponse.json(
      { success: false, error: 'Assessment access denied.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const result = deletePdpAssessment(id);
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
      {
        success: false,
        error: error instanceof Error ? error.message : 'Assessment deletion failed.',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

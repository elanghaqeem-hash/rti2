import { NextResponse } from 'next/server';
import { hasNistAssessmentAccess } from '@/lib/nist/access';
import { getNistAssessment, getStoredNistResult } from '@/lib/nist/repository';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    if (!hasNistAssessmentAccess(req, id)) {
      return NextResponse.json(
        { success: false, error: 'Assessment access denied.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const assessment = getNistAssessment(id);
    if (assessment.status === 'in_progress') {
      return NextResponse.json(
        {
          success: false,
          error: 'Assessment is not complete yet.',
          assessment,
        },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      {
        success: true,
        assessment,
        result: getStoredNistResult(id),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Assessment result not found.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

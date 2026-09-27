import { NextResponse } from 'next/server';
import { getCurrentNistAssessment } from '@/lib/nist/access';
import { listNistAnswers } from '@/lib/nist/repository';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const assessment = getCurrentNistAssessment(req);
    if (!assessment) {
      return NextResponse.json(
        { success: false, assessment: null },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const answers = listNistAnswers(assessment.id);
    return NextResponse.json(
      { success: true, assessment, answers },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { success: false, assessment: null },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

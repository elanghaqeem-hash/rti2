import { NextResponse } from 'next/server';
import { getCurrentPdpAssessment } from '@/lib/pdp/access';
import {
  getPdpAnswers,
  getPdpAssessmentProfile,
  getPdpEvidence,
} from '@/lib/pdp/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const assessment = getCurrentPdpAssessment(req);
  if (!assessment) {
    return NextResponse.json(
      { success: true, assessment: null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    {
      success: true,
      assessment,
      profile: getPdpAssessmentProfile(assessment.id),
      answers: getPdpAnswers(assessment.id),
      evidence: getPdpEvidence(assessment.id),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

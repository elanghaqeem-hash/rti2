import { NextResponse } from 'next/server';
import { getCurrentPdpAssessment } from '@/lib/pdp/access';
import {
  getPdpAnswersRuntime,
  getPdpAssessmentProfileRuntime,
  getPdpEvidenceRuntime,
} from '@/lib/pdp/runtime-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const assessment = await getCurrentPdpAssessment(req);
  if (!assessment) {
    return NextResponse.json(
      { success: true, assessment: null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const [profile, answers, evidence] = await Promise.all([
    getPdpAssessmentProfileRuntime(assessment.id),
    getPdpAnswersRuntime(assessment.id),
    getPdpEvidenceRuntime(assessment.id),
  ]);

  return NextResponse.json(
    { success: true, assessment, profile, answers, evidence },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

import { NextResponse } from 'next/server';
import { hasPdpAssessmentAccess } from '@/lib/pdp/access';
import {
  getPdpAssessmentRuntime,
  getPdpResultRuntime,
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

  try {
    const assessment = await getPdpAssessmentRuntime(id);
    if (!assessment) throw new Error('Assessment not found.');
    return NextResponse.json(
      { success: true, assessment, result: await getPdpResultRuntime(id) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Assessment result unavailable.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

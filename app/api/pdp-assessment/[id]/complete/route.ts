import { NextResponse } from 'next/server';
import { hasPdpAssessmentAccess } from '@/lib/pdp/access';
import { completePdpAssessmentRuntime } from '@/lib/pdp/runtime-repository';

export const runtime = 'nodejs';

export async function POST(
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
    const result = await completePdpAssessmentRuntime(id);
    return NextResponse.json(
      { success: true, result },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Assessment tidak dapat diselesaikan.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

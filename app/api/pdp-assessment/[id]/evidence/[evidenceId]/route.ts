import { NextResponse } from 'next/server';
import { hasPdpAssessmentAccess } from '@/lib/pdp/access';
import { deletePdpEvidenceRuntime } from '@/lib/pdp/runtime-repository';

export const runtime = 'nodejs';

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; evidenceId: string }> },
) {
  const { id, evidenceId } = await context.params;
  if (!(await hasPdpAssessmentAccess(req, id))) {
    return NextResponse.json(
      { success: false, error: 'Assessment access denied.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    return NextResponse.json(
      { success: true, result: await deletePdpEvidenceRuntime(id, evidenceId) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Evidence deletion failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

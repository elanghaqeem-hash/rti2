import { NextResponse } from 'next/server';
import { deleteIsoEvidence } from '@/lib/iso27001/repository';

export const runtime = 'nodejs';

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; evidenceId: string }> },
) {
  try {
    const { id, evidenceId } = await context.params;
    const token = req.headers.get('x-assessment-token')?.trim() || '';
    return NextResponse.json(
      { success: true, result: deleteIsoEvidence(id, token, evidenceId) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Evidence deletion failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

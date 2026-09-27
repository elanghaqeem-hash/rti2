import { NextResponse } from 'next/server';
import { deleteIsoAssessment, getIsoAssessment, patchIsoAssessment } from '@/lib/iso27001/repository';

export const runtime = 'nodejs';

function token(req: Request) {
  const header = req.headers.get('x-assessment-token')?.trim();
  if (header) return header;
  const auth = req.headers.get('authorization')?.trim();
  return auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(
      { success: true, ...getIsoAssessment(id, token(req)) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Assessment unavailable.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid payload.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const patch = {
      scope:
        body.scope && typeof body.scope === 'object'
          ? (body.scope as Record<string, unknown>)
          : undefined,
      status:
        body.status === 'submitted' || body.status === 'in_progress'
          ? body.status
          : undefined,
    };

    return NextResponse.json(
      { success: true, ...patchIsoAssessment(id, token(req), patch) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Update failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}


export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(
      { success: true, result: deleteIsoAssessment(id, token(req)) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Assessment deletion failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

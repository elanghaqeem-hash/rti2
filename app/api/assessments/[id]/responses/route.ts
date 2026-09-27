import { NextResponse } from 'next/server';
import { saveIsoResponse } from '@/lib/iso27001/repository';

export const runtime = 'nodejs';

function token(req: Request) {
  return req.headers.get('x-assessment-token')?.trim() || '';
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid response payload.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const saved = saveIsoResponse(id, token(req), body);
    return NextResponse.json(
      { success: true, response: saved },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Response could not be saved.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

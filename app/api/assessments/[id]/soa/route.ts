import { NextResponse } from 'next/server';
import { getIsoApplicabilityOptions, getIsoSoa, saveIsoSoa } from '@/lib/iso27001/repository';

export const runtime = 'nodejs';

function token(req: Request) {
  return req.headers.get('x-assessment-token')?.trim() || '';
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(
      { success: true, items: getIsoSoa(id, token(req)), options: getIsoApplicabilityOptions() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'SoA register unavailable.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw new Error('Invalid SoA payload.');
    return NextResponse.json(
      { success: true, result: saveIsoSoa(id, token(req), body) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'SoA update failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

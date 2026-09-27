import { NextResponse } from 'next/server';
import { deleteIsoRisk, listIsoRisks, upsertIsoRisk } from '@/lib/iso27001/repository';

export const runtime = 'nodejs';

function token(req: Request) {
  return req.headers.get('x-assessment-token')?.trim() || '';
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(
      { success: true, risks: listIsoRisks(id, token(req)) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Risk register unavailable.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw new Error('Invalid risk payload.');
    return NextResponse.json(
      { success: true, risk: upsertIsoRisk(id, token(req), body) },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Risk could not be saved.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const riskId = String(body?.riskId || '').trim();
    if (!riskId) throw new Error('riskId is required.');
    return NextResponse.json(
      { success: true, result: deleteIsoRisk(id, token(req), riskId) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Risk deletion failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

import { NextResponse } from 'next/server';
import { getRfq, saveRfqVersion } from '@/lib/project-estimator/repository';
import type { RfqContent } from '@/lib/project-estimator/types';

export const runtime = 'nodejs';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ success: true, rfq: getRfq(id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, error: 'RFQ not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json().catch(() => null) as any;
  if (!body?.content || typeof body.content !== 'object') {
    return NextResponse.json({ success: false, error: 'RFQ content is required.' }, { status: 400 });
  }
  try {
    const rfq = saveRfqVersion(id, body.content as RfqContent);
    return NextResponse.json({ success: true, rfq }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'RFQ update failed.' }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
  }
}

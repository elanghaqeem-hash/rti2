import { NextResponse } from 'next/server';
import { getIsoGaps } from '@/lib/iso27001/repository';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const token = req.headers.get('x-assessment-token')?.trim() || '';
    return NextResponse.json(
      { success: true, gaps: getIsoGaps(id, token) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Gap register unavailable.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

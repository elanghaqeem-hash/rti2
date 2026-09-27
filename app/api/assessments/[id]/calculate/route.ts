import { NextResponse } from 'next/server';
import { calculateIsoAssessment } from '@/lib/iso27001/repository';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const token = req.headers.get('x-assessment-token')?.trim() || '';
    const result = calculateIsoAssessment(id, token);
    return NextResponse.json(
      { success: true, result },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Scoring failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

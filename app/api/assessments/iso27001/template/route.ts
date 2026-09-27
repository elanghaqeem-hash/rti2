import { NextResponse } from 'next/server';
import { getIsoTemplate, type IsoMode } from '@/lib/iso27001/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode: IsoMode = url.searchParams.get('mode') === 'full' ? 'full' : 'quick';
    const template = getIsoTemplate(mode);
    return NextResponse.json(
      { success: true, ...template },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'ISO 27001 readiness framework is unavailable.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

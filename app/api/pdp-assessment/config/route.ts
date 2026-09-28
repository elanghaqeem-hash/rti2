import { NextResponse } from 'next/server';
import { getPdpConfig } from '@/lib/pdp/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET() {
  try {
    return NextResponse.json(
      { success: true, config: getPdpConfig() },
      { headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'UU PDP readiness framework is unavailable.',
      },
      { status: 503, headers: NO_STORE },
    );
  }
}

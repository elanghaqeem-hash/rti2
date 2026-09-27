import { NextResponse } from 'next/server';
import { getPdpConfig } from '@/lib/pdp/repository';
import { resolveParameterGroups } from '@/lib/parameters/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const globalOptions = await resolveParameterGroups([
      'assessment.company_sizes',
      'pdp.customer_types',
    ]);
    return NextResponse.json(
      {
        success: true,
        ...getPdpConfig(),
        organizationSizes: globalOptions['assessment.company_sizes'] || [],
        customerTypes: globalOptions['pdp.customer_types'] || [],
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'PDP readiness configuration is unavailable.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

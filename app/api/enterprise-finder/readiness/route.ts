import { NextResponse } from 'next/server';
import { getFinderReadinessRuntime } from '@/lib/enterprise-finder/runtime-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const readiness = await getFinderReadinessRuntime();

  return NextResponse.json(
    {
      ready: readiness.ready,
      service: 'enterprise-solution-finder',
      checks: {
        questionnaire: readiness.checks.questions,
        serviceLibrary: readiness.checks.services,
        matchingRules: readiness.checks.mappings,
      },
    },
    {
      status: readiness.ready ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

import { NextResponse } from 'next/server';
import { getEstimatorBootstrap } from '@/lib/project-estimator/repository';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json(
      { success: true, ...getEstimatorBootstrap() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Estimator bootstrap failed:', error);
    return NextResponse.json(
      { success: false, error: 'Project estimator configuration is not available. Ask RTI Admin to apply the latest database migration.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

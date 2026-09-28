import { NextResponse } from 'next/server';
import { adminSessionFromRequest } from '@/lib/admin/auth';
import { runEstimatorRetention } from '@/lib/project-estimator/retention';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const auth = adminSessionFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Admin authentication required.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const body = await req.json().catch(() => null) as any;
  try {
    const result = await runEstimatorRetention({
      olderThanDays: Number(body?.olderThanDays || 90),
      actor: auth.sub,
    });
    return NextResponse.json(
      { success: true, result },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Retention cleanup failed.' },
      { status: 422, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

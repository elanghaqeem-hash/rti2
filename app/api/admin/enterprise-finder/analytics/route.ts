import { NextResponse } from 'next/server';
import { adminSessionFromRequest, adminSessionHasPermission } from '@/lib/admin/auth';
import {
  FinderRuntimeDatabaseUnavailableError,
  getFinderAnalyticsRuntime,
} from '@/lib/enterprise-finder/runtime-repository';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session=adminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Admin authentication required.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if(!adminSessionHasPermission(session,'solution_finder:admin')){
    return NextResponse.json(
      { success: false, error: session.mustChangePassword ? 'Password change required.' : 'Insufficient permission.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    return NextResponse.json(
      {
        success: true,
        analytics: await getFinderAnalyticsRuntime(),
        database: { connected: true },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        analytics: null,
        database: { connected: false },
        error:
          error instanceof FinderRuntimeDatabaseUnavailableError
            ? 'Enterprise Solution Finder database belum diinisialisasi.'
            : 'Analytics Enterprise Solution Finder tidak dapat dimuat.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

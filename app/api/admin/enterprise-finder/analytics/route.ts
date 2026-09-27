import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import {
  FinderDatabaseUnavailableError,
  getFinderAnalytics,
} from '@/lib/enterprise-finder/repository';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: 'Admin authentication required.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    return NextResponse.json(
      {
        success: true,
        analytics: getFinderAnalytics(),
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
          error instanceof FinderDatabaseUnavailableError
            ? 'Enterprise Solution Finder database belum diinisialisasi.'
            : 'Analytics Enterprise Solution Finder tidak dapat dimuat.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

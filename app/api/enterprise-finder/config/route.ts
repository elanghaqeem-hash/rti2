import { NextResponse } from 'next/server';
import {
  FinderRuntimeDatabaseUnavailableError,
  getFinderConfigRuntime,
} from '@/lib/enterprise-finder/runtime-repository';
import type { FinderLocale } from '@/lib/enterprise-finder/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function localeFromRequest(req: Request): FinderLocale {
  const url = new URL(req.url);
  const locale = url.searchParams.get('locale');
  return locale === 'en' ? 'en' : 'id';
}

export async function GET(req: Request) {
  try {
    const config = await getFinderConfigRuntime(localeFromRequest(req));
    return NextResponse.json(
      {
        success: true,
        config,
        database: { connected: true },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch (error) {
    const unavailable = error instanceof FinderRuntimeDatabaseUnavailableError;
    return NextResponse.json(
      {
        success: false,
        config: null,
        database: { connected: false },
        error: unavailable
          ? 'Enterprise Solution Finder sedang dalam proses aktivasi. Silakan coba kembali beberapa saat lagi.'
          : 'Konfigurasi Enterprise Solution Finder tidak dapat dimuat.',
      },
      {
        status: unavailable ? 503 : 500,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}

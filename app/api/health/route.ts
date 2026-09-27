import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  const databaseConnected = checkDatabaseConnection();

  return NextResponse.json(
    {
      service: 'rti-web',
      status: databaseConnected ? 'ok' : 'degraded',
      database: databaseConnected ? 'connected' : 'unavailable',
      timestamp: new Date().toISOString(),
    },
    {
      status: databaseConnected ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

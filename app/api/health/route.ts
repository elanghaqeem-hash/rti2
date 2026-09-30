import { NextResponse } from 'next/server';
import { getRuntimeDatabaseHealth } from '@/lib/server/runtime-database';
import { getPrivateObjectStorageHealth } from '@/lib/server/object-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startedAt = Date.now();

  const [database, storage] = await Promise.all([
    getRuntimeDatabaseHealth(),
    getPrivateObjectStorageHealth(),
  ]);

  const uploadsEnabled =
    String(process.env.RTI_FILE_UPLOADS_ENABLED || 'false').toLowerCase() === 'true';

  const ready = database.connected && (!uploadsEnabled || storage.available);
  const body = {
    status: ready ? 'ok' : 'degraded',
    service: 'rti-web',
    timestamp: new Date().toISOString(),
    uptimeSeconds:
      typeof process.uptime === 'function' ? Math.round(process.uptime()) : undefined,
    release: {
      version: String(process.env.RTI_APP_VERSION || '').trim() || undefined,
      commit: String(process.env.GIT_COMMIT_SHA || '').trim() || undefined,
    },
    checks: {
      database: {
        ok: database.connected,
        driver: database.kind,
      },
      storage: {
        ok: uploadsEnabled ? storage.available : true,
        enabled: uploadsEnabled,
        driver: storage.backend,
      },
    },
    responseTimeMs: Date.now() - startedAt,
  };

  return NextResponse.json(body, {
    status: ready ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

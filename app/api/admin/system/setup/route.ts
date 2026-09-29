import { NextResponse } from 'next/server';
import { adminSessionFromRequest, adminSessionHasPermission } from '@/lib/admin/auth';
import { enforceSameOriginMutation } from '@/lib/security/request-protection';
import {
  applyRuntimePendingMigrations,
  getRuntimeMigrationStatus,
} from '@/lib/server/runtime-migrations';
import { RuntimeDatabaseUnavailableError } from '@/lib/server/runtime-database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unauthorized(status=401, error='Admin authentication required.') {
  return NextResponse.json(
    { success: false, error },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

function setupError(error: unknown) {
  if (error instanceof RuntimeDatabaseUnavailableError && error.message.includes('RTI_DB')) {
    return 'Binding D1 RTI_DB belum tersedia pada Worker ini. Hubungkan database D1 produksi pada konfigurasi deployment, lalu muat ulang halaman ini sebelum menjalankan migrasi.';
  }
  return error instanceof Error ? error.message : 'Database setup gagal.';
}

function publicStatus(
  status: Awaited<ReturnType<typeof getRuntimeMigrationStatus>>,
) {
  return {
    databasePath: status.database.descriptor,
    databaseKind: status.database.kind,
    connected: status.database.connected,
    applied: status.applied,
    pending: status.pending,
    tables: status.tables,
  };
}

export async function GET(req: Request) {
  const session=adminSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!adminSessionHasPermission(session,'system:admin')) {
    return unauthorized(403, session.mustChangePassword ? 'Password change required.' : 'Insufficient permission.');
  }

  try {
    const status = await getRuntimeMigrationStatus();
    return NextResponse.json(
      { success: true, status: publicStatus(status) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: setupError(error),
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function POST(req: Request) {
  const session=adminSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!adminSessionHasPermission(session,'system:admin')) {
    return unauthorized(403, session.mustChangePassword ? 'Password change required.' : 'Insufficient permission.');
  }
  const origin=enforceSameOriginMutation(req);
  if(!origin.allowed) return unauthorized(403, origin.reason || 'Cross-origin request denied.');

  try {
    const status = await applyRuntimePendingMigrations();
    return NextResponse.json(
      { success: true, status: publicStatus(status) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: setupError(error),
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

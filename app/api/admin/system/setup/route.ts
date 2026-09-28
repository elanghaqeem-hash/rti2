import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import {
  applyRuntimePendingMigrations,
  getRuntimeMigrationStatus,
} from '@/lib/server/runtime-migrations';
import { RuntimeDatabaseUnavailableError } from '@/lib/server/runtime-database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json(
    { success: false, error: 'Admin authentication required.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
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
  if (!isAdminRequest(req)) return unauthorized();

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
  if (!isAdminRequest(req)) return unauthorized();

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

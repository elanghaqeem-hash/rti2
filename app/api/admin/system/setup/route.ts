import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import {
  applyPendingMigrations,
  getMigrationStatus,
} from '@/lib/server/migrations';

export const runtime = 'nodejs';

function unauthorized() {
  return NextResponse.json(
    { success: false, error: 'Admin authentication required.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();

  try {
    return NextResponse.json(
      { success: true, status: getMigrationStatus() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database status check failed.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();

  try {
    const status = applyPendingMigrations();
    return NextResponse.json(
      { success: true, status },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database migration failed.',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

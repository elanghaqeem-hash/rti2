import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import {
  getPdpAdminDashboardRuntime,
  patchPdpAdminConfigRuntime,
} from '@/lib/pdp/runtime-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

function unauthorized() {
  return NextResponse.json(
    { success: false, error: 'Admin authentication required.' },
    { status: 401, headers: NO_STORE },
  );
}

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();

  try {
    return NextResponse.json(
      { success: true, dashboard: await getPdpAdminDashboardRuntime() },
      { headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'UU PDP admin configuration is unavailable.',
      },
      { status: 503, headers: NO_STORE },
    );
  }
}

export async function PATCH(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, error: 'Invalid admin update payload.' },
      { status: 400, headers: NO_STORE },
    );
  }

  const value = body as Record<string, unknown>;
  const entity = String(value.entity || '').trim().slice(0, 40);
  const key = String(value.key || '').trim().slice(0, 180);
  const changes =
    value.changes && typeof value.changes === 'object' && !Array.isArray(value.changes)
      ? (value.changes as Record<string, unknown>)
      : {};

  if (!entity || !key) {
    return NextResponse.json(
      { success: false, error: 'Admin entity and key are required.' },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const after = await patchPdpAdminConfigRuntime({ entity, key, changes });
    return NextResponse.json(
      {
        success: true,
        entity,
        key,
        after,
        dashboard: await getPdpAdminDashboardRuntime(),
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'PDP admin update failed.',
      },
      { status: 400, headers: NO_STORE },
    );
  }
}

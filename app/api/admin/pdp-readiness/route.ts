import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import {
  createAdminPdpEntity,
  deactivateAdminPdpEntity,
  getAdminPdpCatalog,
  updateAdminPdpEntity,
} from '@/lib/pdp/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json(
    { success: false, error: 'Admin authentication required.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}

function payloadFrom(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();

  try {
    return NextResponse.json(
      { success: true, catalog: getAdminPdpCatalog() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'PDP readiness admin database is unavailable.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  const body = await req.json().catch(() => null);
  const entity = String(body?.entity || '').trim();
  const payload = payloadFrom(body?.payload);

  try {
    const id = createAdminPdpEntity(entity, payload);
    return NextResponse.json(
      { success: true, id },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to create PDP configuration.',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function PUT(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  const body = await req.json().catch(() => null);
  const entity = String(body?.entity || '').trim();
  const payload = payloadFrom(body?.payload);

  try {
    const updated = updateAdminPdpEntity(entity, payload);
    return NextResponse.json(
      { success: updated },
      {
        status: updated ? 200 : 404,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to update PDP configuration.',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function DELETE(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  const body = await req.json().catch(() => null);
  const entity = String(body?.entity || '').trim();
  const id = String(body?.id || '').trim().slice(0, 160);

  if (!entity || !id) {
    return NextResponse.json(
      { success: false, error: 'Entity and id are required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const updated = deactivateAdminPdpEntity(entity, id);
    return NextResponse.json(
      { success: updated },
      {
        status: updated ? 200 : 404,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to deactivate PDP configuration.',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

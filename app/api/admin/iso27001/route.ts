import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import {
  changeIsoVersionStatus,
  cloneIsoVersion,
  createIsoAdminEntity,
  deleteIsoAdminEntity,
  getIsoAdminSnapshot,
  updateIsoAdminEntity,
} from '@/lib/iso27001/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json(
    { success: false, error: 'Admin authentication required.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();

  try {
    const url = new URL(req.url);
    const versionId = url.searchParams.get('versionId') || undefined;
    return NextResponse.json(
      { success: true, snapshot: getIsoAdminSnapshot(versionId) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'ISO admin data unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function PUT(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw new Error('Invalid payload.');
    const entity = String(body.entity || '') as Parameters<typeof updateIsoAdminEntity>[0];
    const id = String(body.id || '').trim();
    if (!id) throw new Error('Entity id is required.');
    const patch = body.patch && typeof body.patch === 'object' ? body.patch : {};
    return NextResponse.json(
      { success: true, result: updateIsoAdminEntity(entity, id, patch) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Update failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw new Error('Invalid payload.');

    if (body.action === 'clone_version') {
      return NextResponse.json(
        { success: true, result: cloneIsoVersion(String(body.sourceVersionId || ''), String(body.newVersion || '')) },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (body.action === 'set_version_status') {
      const status = String(body.status || '') as 'Draft' | 'Review' | 'Published' | 'Archived';
      if (!['Draft','Review','Published','Archived'].includes(status)) throw new Error('Invalid version status.');
      return NextResponse.json(
        { success: true, result: changeIsoVersionStatus(String(body.versionId || ''), status) },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (body.action === 'create_entity') {
      const entity = String(body.entity || '') as Parameters<typeof createIsoAdminEntity>[0];
      const versionId = String(body.versionId || '').trim();
      const input = body.input && typeof body.input === 'object' ? body.input : {};
      return NextResponse.json(
        { success: true, result: createIsoAdminEntity(entity, versionId, input) },
        { status: 201, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    throw new Error('Unsupported admin action.');
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Admin action failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function DELETE(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw new Error('Invalid payload.');
    const entity = String(body.entity || '') as Parameters<typeof deleteIsoAdminEntity>[0];
    const id = String(body.id || '').trim();
    if (!id) throw new Error('Entity id is required.');
    return NextResponse.json(
      { success: true, result: deleteIsoAdminEntity(entity, id) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Deactivate failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

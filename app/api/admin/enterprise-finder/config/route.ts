import { NextResponse } from 'next/server';
import {
  adminSessionFromRequest,
  isAdminRequest,
} from '@/lib/admin/auth';
import {
  FinderAdminDatabaseUnavailableError,
  getFinderAdminConfig,
  upsertFinderAdminEntity,
} from '@/lib/enterprise-finder/admin-repository';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' };

function clientIp(req: Request) {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    ''
  ).slice(0, 100);
}

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
      {
        success: true,
        config: getFinderAdminConfig(),
        database: { connected: true },
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        config: null,
        database: { connected: false },
        error:
          error instanceof FinderAdminDatabaseUnavailableError
            ? 'Database Enterprise Solution Finder belum diinisialisasi.'
            : 'Konfigurasi Enterprise Solution Finder tidak dapat dimuat.',
      },
      { status: 503, headers: NO_STORE },
    );
  }
}

export async function PUT(req: Request) {
  const session = adminSessionFromRequest(req);
  if (!session) return unauthorized();

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 100_000) {
    return NextResponse.json(
      { success: false, error: 'Payload konfigurasi terlalu besar.' },
      { status: 413, headers: NO_STORE },
    );
  }

  const body = await req.json().catch(() => null);
  const entityType = body?.entityType;
  const payload =
    body?.payload && typeof body.payload === 'object'
      ? (body.payload as Record<string, unknown>)
      : null;

  if (
    !payload ||
    !['question', 'option', 'service', 'mapping', 'weight', 'prompt'].includes(entityType)
  ) {
    return NextResponse.json(
      { success: false, error: 'Tipe konfigurasi atau payload tidak valid.' },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = upsertFinderAdminEntity({
      entityType,
      payload,
      actor: session.sub,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(
      { success: true, result },
      { headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof FinderAdminDatabaseUnavailableError
            ? 'Database Enterprise Solution Finder belum diinisialisasi.'
            : error instanceof Error
              ? `Konfigurasi tidak dapat disimpan: ${error.message}`
              : 'Konfigurasi tidak dapat disimpan.',
      },
      { status: 400, headers: NO_STORE },
    );
  }
}

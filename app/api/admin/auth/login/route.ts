import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  adminSessionConfigured,
  createAdminSession,
} from '@/lib/admin/auth';
import { authenticateInternalUser } from '@/lib/admin/rbac';
import { enforceRateLimit, rateLimitHeaders, enforceSameOriginMutation } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const origin = enforceSameOriginMutation(req);
  if (!origin.allowed) {
    return NextResponse.json(
      { success: false, error: origin.reason || 'Cross-origin request denied.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const rateLimit = await enforceRateLimit(req, {
    bucket: 'admin-login',
    limit: 5,
    windowSeconds: 900,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error:
          rateLimit.reason === 'limit-exceeded'
            ? 'Terlalu banyak percobaan login. Silakan coba kembali nanti.'
            : 'Proteksi login belum siap.',
      },
      {
        status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
        headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(rateLimit) },
      },
    );
  }

  if (!adminSessionConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal session signing belum dikonfigurasi pada server.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 20_000) {
    return NextResponse.json(
      { success: false, error: 'Request terlalu besar.' },
      { status: 413, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const identity = await authenticateInternalUser(username, password);
  if (!identity) {
    return NextResponse.json(
      { success: false, error: 'Username atau password tidak valid.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const response = NextResponse.json(
    {
      success: true,
      role: 'admin',
      roles: identity.roles,
      permissions: identity.permissions,
      mustChangePassword: identity.mustChangePassword,
      authSource: identity.authSource,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );

  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(identity), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });

  return response;
}

import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  adminAuthConfigured,
  createAdminSession,
  validateAdminCredentials,
} from '@/lib/admin/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!adminAuthConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Admin authentication belum dikonfigurasi pada server.',
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

  if (!validateAdminCredentials(username, password)) {
    return NextResponse.json(
      { success: false, error: 'Username atau password tidak valid.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const response = NextResponse.json(
    { success: true, role: 'admin' },
    { headers: { 'Cache-Control': 'no-store' } },
  );

  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });

  return response;
}

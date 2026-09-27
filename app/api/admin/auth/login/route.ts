import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  isAdminBootstrapConfigured,
  verifyAdminCredentials,
} from '@/lib/admin/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isAdminBootstrapConfigured()) {
    return NextResponse.json(
      {
        error:
          'Admin belum dikonfigurasi. Set ADMIN_EMAIL, ADMIN_PASSWORD, dan ADMIN_SESSION_SECRET pada environment deployment.',
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email dan password wajib diisi.' },
      { status: 400 },
    );
  }

  const valid = await verifyAdminCredentials(email, password);
  if (!valid) {
    return NextResponse.json(
      { error: 'Email atau password admin tidak valid.' },
      { status: 401 },
    );
  }

  const token = await createAdminSessionToken(email);
  const response = NextResponse.json({
    ok: true,
    role: 'SUPER_ADMIN',
  });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return response;
}

import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin/auth';

export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );

  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}

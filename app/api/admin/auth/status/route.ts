import { NextResponse } from 'next/server';
import { adminSessionFromRequest } from '@/lib/admin/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = adminSessionFromRequest(req);

  return NextResponse.json(
    {
      authenticated: Boolean(session),
      role: session?.role || null,
      username: session?.sub || null,
    },
    {
      status: session ? 200 : 401,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

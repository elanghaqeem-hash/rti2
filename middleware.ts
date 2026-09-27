import { NextRequest, NextResponse } from 'next/server';

const ADMIN_SESSION_COOKIE = 'rti_admin_session';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin/')) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/admin-access', req.url);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};

import { NextRequest, NextResponse } from 'next/server';

function constantTimeEqual(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return mismatch === 0;
}

function decodeBasicAuthorization(value: string | null) {
  if (!value?.startsWith('Basic ')) return null;

  try {
    const decoded = atob(value.slice(6));
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function unauthorized(pathname: string) {
  const headers = {
    'Cache-Control': 'no-store',
    'WWW-Authenticate': 'Basic realm="Risetin Admin", charset="UTF-8"',
  };

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { status: 401, headers },
    );
  }

  return new NextResponse(
    '<!doctype html><html lang="id"><meta charset="utf-8"><title>Risetin Admin</title><body style="font-family:system-ui;padding:40px"><h1>Authentication required</h1><p>Masukkan kredensial administrator yang sah.</p></body></html>',
    {
      status: 401,
      headers: {
        ...headers,
        'Content-Type': 'text/html; charset=utf-8',
      },
    },
  );
}

function misconfigured(pathname: string) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Admin authentication is not configured.' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  return new NextResponse(
    '<!doctype html><html lang="id"><meta charset="utf-8"><title>Risetin Admin</title><body style="font-family:system-ui;padding:40px"><h1>Admin unavailable</h1><p>Authentication belum dikonfigurasi pada environment production.</p></body></html>',
    {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
      },
    },
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const protectsAdminPage = pathname.startsWith('/admin');
  const protectsLeadRead =
    pathname === '/api/leads' && ['GET', 'HEAD', 'DELETE', 'PATCH', 'PUT'].includes(req.method);

  if (!protectsAdminPage && !protectsLeadRead) {
    return NextResponse.next();
  }

  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return misconfigured(pathname);
  }

  const credentials = decodeBasicAuthorization(req.headers.get('authorization'));
  if (
    !credentials ||
    !constantTimeEqual(credentials.username, expectedUsername) ||
    !constantTimeEqual(credentials.password, expectedPassword)
  ) {
    return unauthorized(pathname);
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/leads'],
};

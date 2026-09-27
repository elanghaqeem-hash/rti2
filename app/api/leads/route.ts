import { NextResponse } from 'next/server';
import { enforceRateLimit, rateLimitHeaders, verifyTurnstile } from '@/lib/security/request-protection';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

function databaseUnavailablePayload() {
  return {
    success: false,
    leads: [],
    database: {
      connected: false,
      persistence: 'unavailable',
    },
    error:
      'Database belum terhubung. Tidak ada data dummy, sample, fallback, atau penyimpanan sementara yang digunakan.',
  };
}

export async function POST(req: Request) {
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'lead-submit',
    limit: 8,
    windowSeconds: 300,
  });

  if (!rateLimit.allowed) {
    const status = rateLimit.reason === 'limit-exceeded' ? 429 : 503;
    return NextResponse.json(
      {
        success: false,
        error:
          status === 429
            ? 'Terlalu banyak pengiriman formulir. Silakan coba kembali beberapa menit lagi.'
            : 'Proteksi formulir belum siap.',
      },
      {
        status,
        headers: {
          ...NO_STORE_HEADERS,
          ...rateLimitHeaders(rateLimit),
        },
      },
    );
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 100_000) {
    return NextResponse.json(
      { success: false, error: 'Payload formulir terlalu besar.' },
      {
        status: 413,
        headers: {
          ...NO_STORE_HEADERS,
          ...rateLimitHeaders(rateLimit),
        },
      },
    );
  }

  const body = await req.json().catch(() => null);
  const turnstile = await verifyTurnstile(
    req,
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).turnstileToken
      : undefined,
  );

  if (!turnstile.success) {
    return NextResponse.json(
      {
        success: false,
        error: turnstile.error || 'Bot verification failed.',
      },
      {
        status: turnstile.configured ? 400 : 503,
        headers: {
          ...NO_STORE_HEADERS,
          ...rateLimitHeaders(rateLimit),
        },
      },
    );
  }

  return NextResponse.json(
    {
      ...databaseUnavailablePayload(),
      error:
        'Database belum terhubung. Data tidak diterima atau disimpan untuk mencegah penyimpanan non-persisten.',
    },
    {
      status: 503,
      headers: {
        ...NO_STORE_HEADERS,
        ...rateLimitHeaders(rateLimit),
      },
    }
  );
}

export async function GET() {
  return NextResponse.json(databaseUnavailablePayload(), {
    status: 503,
    headers: NO_STORE_HEADERS,
  });
}

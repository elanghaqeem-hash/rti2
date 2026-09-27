import { NextResponse } from 'next/server';

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

export async function POST(_req: Request) {
  return NextResponse.json(
    {
      ...databaseUnavailablePayload(),
      error:
        'Database belum terhubung. Data tidak diterima atau disimpan untuk mencegah penyimpanan non-persisten.',
    },
    {
      status: 503,
      headers: NO_STORE_HEADERS,
    }
  );
}

export async function GET() {
  return NextResponse.json(databaseUnavailablePayload(), {
    status: 503,
    headers: NO_STORE_HEADERS,
  });
}

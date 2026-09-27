import { NextResponse } from 'next/server';
import { getPublicCmsSettings } from '@/lib/admin/settings-store';

export const runtime = 'nodejs';

export async function GET() {
  const cms = await getPublicCmsSettings();
  return NextResponse.json(
    { cms },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}

import { NextResponse } from 'next/server';
import {
  AI_PROVIDER_IDS,
  getAdminSettings,
  type AiProviderId,
} from '@/lib/admin/settings-store';
import { testAiProviderConnection } from '@/lib/ai/provider-router';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const kind = body?.kind;

  if (kind === 'ai') {
    const provider = String(body?.provider || '') as AiProviderId;
    if (!AI_PROVIDER_IDS.includes(provider)) {
      return NextResponse.json(
        { ok: false, error: 'Provider AI tidak valid.' },
        { status: 400 },
      );
    }

    const result = await testAiProviderConnection(provider);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  if (kind === 'smtp') {
    const settings = await getAdminSettings();
    const smtp = settings.smtp;
    const missing = [
      !smtp.host ? 'host' : null,
      !smtp.port ? 'port' : null,
      !smtp.username ? 'username' : null,
      !smtp.password ? 'password' : null,
      !smtp.fromEmail ? 'fromEmail' : null,
    ].filter(Boolean);

    if (!smtp.enabled) {
      return NextResponse.json(
        {
          ok: false,
          detail: 'SMTP masih dinonaktifkan.',
        },
        { status: 400 },
      );
    }

    if (missing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          detail: 'Konfigurasi SMTP belum lengkap: ' + missing.join(', '),
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      detail:
        'Konfigurasi SMTP lengkap dan tersimpan. Uji pengiriman aktual dilakukan oleh modul email saat transport SMTP diaktifkan.',
    });
  }

  return NextResponse.json(
    { ok: false, error: 'Jenis pengujian tidak didukung.' },
    { status: 400 },
  );
}

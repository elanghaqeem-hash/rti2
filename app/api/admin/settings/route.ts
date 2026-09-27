import { NextResponse } from 'next/server';
import {
  AI_PROVIDER_IDS,
  type AdminSettings,
  type AiProviderId,
  getAdminSettings,
  getSettingsStorageStatus,
  saveAdminSettings,
  toClientAdminSettings,
} from '@/lib/admin/settings-store';

export const runtime = 'nodejs';

function textValue(
  value: unknown,
  fallback: string,
  maxLength = 500,
): string {
  if (typeof value !== 'string') return fallback;
  const next = value.trim();
  if (!next) return fallback;
  return next.slice(0, maxLength);
}

function optionalSecret(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const next = value.trim();
  return next ? next.slice(0, 5000) : fallback;
}

function boolValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function numberValue(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed), min), max);
}

function urlValue(value: unknown, fallback: string): string {
  const next = textValue(value, fallback, 1000);
  try {
    const parsed = new URL(next);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return fallback;
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
}

function normalizeProviderOrder(
  value: unknown,
  fallback: AiProviderId[],
): AiProviderId[] {
  if (!Array.isArray(value)) return fallback;
  const allowed = new Set<string>(AI_PROVIDER_IDS);
  const next = value
    .map((item) => String(item).trim().toLowerCase())
    .filter((item): item is AiProviderId => allowed.has(item));

  return next.length > 0 ? Array.from(new Set(next)) : fallback;
}

export async function GET() {
  const settings = await getAdminSettings();
  return NextResponse.json(
    {
      settings: toClientAdminSettings(settings),
      storage: getSettingsStorageStatus(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Payload konfigurasi tidak valid.' },
      { status: 400 },
    );
  }

  const current = await getAdminSettings();
  const input = body as any;

  const providers = Object.fromEntries(
    AI_PROVIDER_IDS.map((id) => {
      const existing = current.ai.providers[id];
      const incoming = input.ai?.providers?.[id] || {};
      return [
        id,
        {
          enabled: boolValue(incoming.enabled, existing.enabled),
          model: textValue(incoming.model, existing.model, 160),
          apiKey: optionalSecret(incoming.apiKey, existing.apiKey),
        },
      ];
    }),
  ) as AdminSettings['ai']['providers'];

  const next: AdminSettings = {
    version: 1,
    updatedAt: current.updatedAt,
    cms: {
      heroEyebrow: textValue(
        input.cms?.heroEyebrow,
        current.cms.heroEyebrow,
        120,
      ),
      heroTitle: textValue(
        input.cms?.heroTitle,
        current.cms.heroTitle,
        120,
      ),
      heroHighlight: textValue(
        input.cms?.heroHighlight,
        current.cms.heroHighlight,
        120,
      ),
      positioning: textValue(
        input.cms?.positioning,
        current.cms.positioning,
        1200,
      ),
      contactEmail: textValue(
        input.cms?.contactEmail,
        current.cms.contactEmail,
        254,
      ),
      phone: textValue(input.cms?.phone, current.cms.phone, 60),
      whatsapp: textValue(
        input.cms?.whatsapp,
        current.cms.whatsapp,
        60,
      ),
      whatsappUrl: urlValue(
        input.cms?.whatsappUrl,
        current.cms.whatsappUrl,
      ),
      officeAddress: textValue(
        input.cms?.officeAddress,
        current.cms.officeAddress,
        500,
      ),
      bookingUrl: urlValue(
        input.cms?.bookingUrl,
        current.cms.bookingUrl,
      ),
    },
    ai: {
      providerOrder: normalizeProviderOrder(
        input.ai?.providerOrder,
        current.ai.providerOrder,
      ),
      timeoutMs: numberValue(
        input.ai?.timeoutMs,
        current.ai.timeoutMs,
        3000,
        20000,
      ),
      providers,
    },
    smtp: {
      enabled: boolValue(input.smtp?.enabled, current.smtp.enabled),
      host: textValue(input.smtp?.host, current.smtp.host, 255),
      port: numberValue(input.smtp?.port, current.smtp.port, 1, 65535),
      secure: boolValue(input.smtp?.secure, current.smtp.secure),
      username: textValue(
        input.smtp?.username,
        current.smtp.username,
        320,
      ),
      password: optionalSecret(
        input.smtp?.password,
        current.smtp.password,
      ),
      fromName: textValue(
        input.smtp?.fromName,
        current.smtp.fromName,
        160,
      ),
      fromEmail: textValue(
        input.smtp?.fromEmail,
        current.smtp.fromEmail,
        254,
      ),
      replyTo: textValue(
        input.smtp?.replyTo,
        current.smtp.replyTo,
        254,
      ),
    },
  };

  try {
    const saved = await saveAdminSettings(next);
    return NextResponse.json({
      ok: true,
      settings: toClientAdminSettings(saved),
      storage: getSettingsStorageStatus(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Gagal menyimpan konfigurasi admin.',
        storage: getSettingsStorageStatus(),
      },
      { status: 503 },
    );
  }
}
